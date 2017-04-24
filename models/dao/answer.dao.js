'use strict';

const _ = require('lodash');

const Base = require('./base');
const RRError = require('../../lib/rr-error');
const SPromise = require('../../lib/promise');

const answerCommon = require('./answer-common');
const registryCommon = require('./registry-common');

const ExportCSVConverter = require('../../export/csv-converter.js');
const ImportCSVConverter = require('../../import/csv-converter.js');

const evaluateAnswerRule = function ({ logic, answer }, questionAnswer) {
    if (logic === 'exists') {
        if (questionAnswer && (questionAnswer.answer || questionAnswer.answers)) {
            return true;
        }
    }
    if (logic === 'not-exists') {
        if (!(questionAnswer && (questionAnswer.answer || questionAnswer.answers))) {
            return true;
        }
    }
    if (logic === 'equals') {
        if (!questionAnswer) {
            return false;
        }

        if (_.isEqual(answer, questionAnswer.answer)) {
            return true;
        }
    }
    if (logic === 'not-equals') {
        if (!questionAnswer) {
            return false;
        }
        if (!_.isEqual(answer, questionAnswer.answer)) {
            return true;
        }
    }
    return false;
};

const evaluateEnableWhen = function (rules, answersByQuestionId) {
    return rules.some((rule) => {
        const sourceQuestionId = rule.questionId;
        const sourceAnswer = answersByQuestionId[sourceQuestionId];
        return evaluateAnswerRule(rule, sourceAnswer);
    });
};

const basicExportFields = [
    'surveyId', 'questionId', 'questionChoiceId', 'questionType', 'choiceType', 'value',
];

const isEnabled = function ({ questionId, parents }, maps) {
    const { questionAnswerRulesMap, sectionAnswerRulesMap, answersByQuestionId } = maps;
    const rules = questionAnswerRulesMap.get(questionId);
    if (rules && rules.length) {
        const enabled = evaluateEnableWhen(rules, answersByQuestionId);
        return enabled;
    }
    if (parents && parents.length) {
        const enabled = parents.every((parent) => {
            if (parent.sectionId) {
                const rules2 = sectionAnswerRulesMap.get(parent.sectionId);
                if (rules2 && rules2.length) {
                    return evaluateEnableWhen(rules2, answersByQuestionId);
                }
                return true;
            }
            if (parent.questionId) {
                const rules2 = questionAnswerRulesMap.get(parent.questionId);
                if (rules2 && rules2.length) {
                    return evaluateEnableWhen(rules2, answersByQuestionId);
                }
                return true;
            }
            return true;
        });
        if (!enabled) {
            return false;
        }
    }
    return true;
};

module.exports = class AnswerDAO extends Base {
    constructor(db, dependencies) {
        super(db);
        Object.assign(this, dependencies);
    }

    fileAnswer({ userId, surveyId, language, answers }, transaction) {
        const Answer = this.db.Answer;
        const records = answers.reduce((r, p) => {
            const questionId = p.questionId;
            const dbValues = answerCommon.prepareAnswerForDB(p.answer || p.answers);
            dbValues.forEach((v) => {
                const mndx = v.multipleIndex;
                const value = {
                    userId,
                    surveyId,
                    language,
                    questionId,
                    questionChoiceId: v.questionChoiceId || null,
                    multipleIndex: (mndx || mndx === 0) ? mndx : null,
                    value: 'value' in v ? v.value : null,
                };
                r.push(value);
            });
            return r;
        }, []);
        return Answer.bulkCreate(records, { transaction });
    }

    updateStatus(userId, surveyId, status, transaction) {
        const UserSurvey = this.db.UserSurvey;
        return UserSurvey.findOne({
            where: { userId, surveyId },
            raw: true,
            attributes: ['status'],
            transaction,
        })
            .then((userSurvey) => {
                const record = { userId, surveyId, status };
                if (!userSurvey) {
                    return UserSurvey.create(record, { transaction });
                } else if (userSurvey.status !== status) {
                    return UserSurvey.destroy({ where: { userId, surveyId }, transaction })
                        .then(() => UserSurvey.create(record, { transaction }));
                }
                return null;
            });
    }

    validateConsent(userId, surveyId, action, transaction) {
        return this.surveyConsentDocument.listSurveyConsentDocuments({
            userId,
            surveyId,
            action,
        }, {}, transaction)
            .then((consentDocuments) => {
                if (consentDocuments && consentDocuments.length > 0) {
                    const err = new RRError('profileSignaturesMissing');
                    err.consentDocuments = consentDocuments;
                    return SPromise.reject(err);
                }
                return null;
            });
    }

    validateAnswers(userId, surveyId, answers, status) {
        const Answer = this.db.Answer;
        return this.surveyQuestion.listSurveyQuestions(surveyId, true)
            .then((surveyQuestions) => {
                const answersByQuestionId = _.keyBy(answers, 'questionId');
                return this.answerRule.getQuestionExpandedSurveyAnswerRules(surveyId)
                    .then(({ sectionAnswerRulesMap, questionAnswerRulesMap }) => {
                        surveyQuestions.forEach((r) => {
                            const questionId = r.questionId;
                            const answer = answersByQuestionId[questionId];
                            if (sectionAnswerRulesMap || questionAnswerRulesMap) {
                                const maps = {
                                    questionAnswerRulesMap,
                                    sectionAnswerRulesMap,
                                    answersByQuestionId,
                                };
                                const enabled = isEnabled(r, maps);
                                if (!enabled) {
                                    r.ignore = true;
                                }
                            }
                            if (r.ignore) {
                                if (answer) {
                                    throw new RRError('answerToBeSkippedAnswered');
                                }
                                r.required = false;
                                answers.push({ questionId });
                                return;
                            }
                            if (answer && (answer.answer || answer.answers)) {
                                r.required = false;
                            }
                        });
                        return surveyQuestions;
                    });
            })
            .then(surveyQuestions => _.keyBy(surveyQuestions, 'questionId'))
            .then((qxMap) => {
                answers.forEach((answer) => {
                    const qx = qxMap[answer.questionId];
                    if (!qx) {
                        throw new RRError('answerQxNotInSurvey');
                    }
                });
                return qxMap;
            })
            .then((qxMap) => {
                if (status === 'completed') {
                    const remainingRequired = new Set();
                    _.values(qxMap).forEach((qx) => {
                        if (qx.required) {
                            remainingRequired.add(qx.questionId);
                        }
                    });
                    if (remainingRequired.size) {
                        const ids = [...remainingRequired];
                        return Answer.findAll({
                            raw: true,
                            where: { userId, surveyId, questionId: { $in: ids } },
                            attributes: ['questionId'],
                        })
                            .then((records) => {
                                const questionIds = records.map(record => record.questionId);
                                const existingRequired = new Set(questionIds);
                                if (existingRequired.size !== remainingRequired.size) {
                                    throw new RRError('answerRequiredMissing');
                                }
                            });
                    }
                }
                return null;
            });
    }

    validateCreate(userId, surveyId, answers, status, transaction) {
        return this.validateAnswers(userId, surveyId, answers, status)
            .then(() => this.validateConsent(userId, surveyId, 'create', transaction));
    }

    createAnswersTx(inputRecord, transaction) {
        const { userId, surveyId } = inputRecord;
        const answers = _.cloneDeep(inputRecord.answers);
        const status = inputRecord.status || 'completed';
        return this.validateCreate(userId, surveyId, answers, status, transaction)
            .then(() => this.updateStatus(userId, surveyId, status, transaction))
            .then(() => {
                const ids = _.map(answers, 'questionId');
                const where = { questionId: { $in: ids }, surveyId, userId };
                return this.db.Answer.destroy({ where, transaction });
            })
            .then(() => {
                const filteredAnswers = _.filter(answers, r => r.answer || r.answers);
                if (filteredAnswers.length) {
                    const language = inputRecord.language || 'en';
                    const record = { userId, surveyId, language, answers: filteredAnswers };
                    return this.fileAnswer(record, transaction);
                }
                return null;
            });
    }

    createAnswers(input) {
        return this.transaction(tx => this.createAnswersTx(input, tx));
    }

    listAnswers({ userId, scope, surveyId, history, ids, userIds }) {
        const Answer = this.db.Answer;
        const Question = this.db.Question;
        const QuestionChoice = this.db.QuestionChoice;
        scope = scope || 'survey'; // eslint-disable-line no-param-reassign
        const where = {};
        if (ids) {
            where.id = { $in: ids };
        }
        if (userId) {
            where.userId = userId;
        }
        if (userIds) {
            where.userId = { $in: userIds };
        }
        if (surveyId) {
            where.surveyId = surveyId;
        }
        if (scope === 'history-only') {
            where.deletedAt = { $ne: null };
        }
        const attributes = ['questionChoiceId', 'language', 'multipleIndex', 'value'];
        if (scope === 'export' || !surveyId) {
            attributes.push('surveyId');
        }
        if (scope === 'history-only') {
            attributes.push(this.timestampColumn('answer', 'deleted', 'SSSS.MS'));
        }
        if (userIds) {
            attributes.push('userId');
        }
        const include = [
            { model: Question, as: 'question', attributes: ['id', 'type', 'multiple'] },
            { model: QuestionChoice, as: 'questionChoice', attributes: ['type'] },
        ];
        return Answer.findAll({ raw: true, where, attributes, include, paranoid: !history })
            .then((result) => {
                result.forEach((r) => {
                    if (r['question.type'] === 'choices') {
                        r.choiceType = r['questionChoice.type'];
                    }
                    delete r['questionChoice.type'];
                });
                return result;
            })
            .then((result) => {
                if (scope === 'export') {
                    return result.map((p) => {
                        const r = { surveyId: p.surveyId };
                        if (userIds) {
                            r.userId = p.userId;
                        }
                        r.questionId = p['question.id'];
                        r.questionType = p['question.type'];
                        if (p.questionChoiceId) {
                            r.questionChoiceId = p.questionChoiceId;
                        }
                        if (p.value) {
                            r.value = p.value;
                        }
                        if (p.choiceType) {
                            r.choiceType = p.choiceType;
                        }
                        return r;
                    });
                }
                const groupedResult = _.groupBy(result, (r) => {
                    let key = r['question.id'];
                    if (r.deletedAt) {
                        key = `${r.deletedAt};${key}`;
                    }
                    if (r.surveyId) {
                        key = `${r.surveyId};${key}`;
                    }
                    return key;
                });
                return Object.keys(groupedResult).map((key) => {
                    const v = groupedResult[key];
                    const r = {
                        questionId: v[0]['question.id'],
                        language: v[0].language,
                    };
                    if (v[0]['question.multiple']) {
                        r.answers = answerCommon.generateAnswer(v[0]['question.type'], v, true);
                    } else {
                        r.answer = answerCommon.generateAnswer(v[0]['question.type'], v, false);
                    }
                    if (scope === 'history-only') {
                        r.deletedAt = v[0].deletedAt;
                    }
                    if (v[0].surveyId) {
                        r.surveyId = v[0].surveyId;
                    }
                    return r;
                });
            });
    }

    getAnswers({ userId, surveyId }) {
        return this.validateConsent(userId, surveyId, 'read')
            .then(() => this.listAnswers({ userId, surveyId }));
    }

    exportForUser(userId) {
        return this.listAnswers({ userId, scope: 'export' })
            .then((answers) => {
                const converter = new ExportCSVConverter({ fields: basicExportFields });
                return converter.dataToCSV(answers);
            });
    }

    exportForUsers(userIds) {
        const fields = ['userId', ...basicExportFields];
        return this.listAnswers({ userIds, scope: 'export' })
            .then((answers) => {
                const converter = new ExportCSVConverter({ fields });
                return converter.dataToCSV(answers);
            });
    }

    importAnswers(stream, maps) {
        const { userId, surveyIdMap, questionIdMap, userIdMap } = maps;
        const converter = new ImportCSVConverter({ checkType: false });
        return converter.streamToRecords(stream)
            .then(records => records.map((r) => {
                r.surveyId = surveyIdMap[r.surveyId];
                const questionIdInfo = questionIdMap[r.questionId];
                r.questionId = questionIdInfo.questionId;
                if (r.questionChoiceId) {
                    const choicesIds = questionIdInfo.choicesIds;
                    r.questionChoiceId = choicesIds[r.questionChoiceId];
                } else {
                    r.questionChoiceId = null;
                }
                if (r.value === '') {
                    delete r.value;
                } else {
                    r.value = r.value.toString();
                }
                if (r.choiceType === 'month' || r.questionType === 'month') {
                    if (r.value.length === 1) {
                        r.value = `0${r.value}`;
                    }
                }
                delete r.questionType;
                delete r.choiceType;
                r.userId = userId || userIdMap[r.userId];
                r.language = 'en';
                return r;
            }))
            .then(records => this.db.Answer.bulkCreate(records));
    }

    importRecords(records) {
        const fn = r => r.map(({ id }) => id);
        return this.db.Answer.bulkCreate(records, { returning: true }).then(fn);
    }

    exportBulk(ids) {
        const Answer = this.db.Answer;
        const Question = this.db.Question;
        const QuestionChoice = this.db.QuestionChoice;
        const createdAtColumn = this.timestampColumn('answer', 'created');
        return Answer.findAll({
            where: { id: { $in: ids } },
            attributes: [
                'id', 'userId', 'surveyId', 'questionId',
                'questionChoiceId', 'value', createdAtColumn,
            ],
            include: [
                { model: Question, as: 'question', attributes: ['id', 'type'] },
                { model: QuestionChoice, as: 'questionChoice', attributes: ['type'] },
            ],
            raw: true,
            paranoid: false,
        });
    }

    searchAllParticipants() {
        const attributes = ['id'];
        return this.db.User.findAll({ raw: true, where: { role: 'participant' }, attributes })
            .then(ids => ids.map(({ id }) => ({ userId: id })));
    }

    /**
     * Search users by their survey answers. Returns a count of users only.
     * @param {object} query questionId:value mapping to search users by
     * @returns {integer}
     */
    searchParticipants(criteria) {
        const n = _.get(criteria, 'questions.length');
        if (!n) {
            return this.searchAllParticipants();
        }

        const questionIds = criteria.questions.map(question => question.id);
        if (questionIds.length !== new Set(questionIds).size) {
            return RRError.reject('searchQuestionRepeat');
        }

        // find answers that match one of the search criteria
        const where = { $or: [] };
        criteria.questions.forEach((question) => {
            answerCommon.prepareFilterAnswersForDB(question.answers).forEach((answer) => {
                where.$or.push({
                    question_id: question.id,
                    value: ('value' in answer) ? answer.value.toString() : null,
                    question_choice_id: answer.questionChoiceId || null,
                });
            });
        });

        // find users with a matching answer for each question (i.e., users who match all criteria)
        const include = [{ model: this.db.User, as: 'user', attributes: [] }];
        const having = this.where(this.literal('COUNT(DISTINCT(question_id))'), n);
        const group = ['user_id'];

        // count resulting users
        const attributes = ['userId'];
        return this.db.Answer.findAll({ raw: true, where, attributes, include, having, group });
    }

    countAllParticipants() {
        return this.db.User.count({ where: { role: 'participant' } })
            .then(count => ({ count }));
    }

    /**
     * Search users by their survey answers. Returns a count of users only.
     * @param {object} query questionId:value mapping to search users by
     * @returns {integer}
     */
    countParticipants(criteria) {
        // if criteria is empty, return count of all users
        if (!_.get(criteria, 'questions.length')) {
            return this.countAllParticipants();
        }

        return this.searchParticipants(criteria)
            .then(results => ({ count: results.length }));
    }

    federatedCriteriaToLocalCriteria(federatedCriteria) {
        const identifiers = federatedCriteria.map(({ identifier }) => identifier);
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { identifier: { $in: identifiers }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                const identifierMap = new Map(federatedCriteria.map(r => [r.identifier, r]));
                const questionMap = new Map();
                const questions = records.reduce((r, record) => {
                    const { identifier, questionId, questionChoiceId } = record;
                    let answers = questionMap.get(questionId);
                    if (!answers) {
                        answers = [];
                        questionMap.set(questionId, answers);
                        r.push({ id: questionId, answers });
                    }
                    const criterion = identifierMap.get(identifier);
                    const answer = _.omit(criterion, 'identifier');
                    if (questionChoiceId) {
                        answer.choice = questionChoiceId;
                    }
                    answers.push(answer);
                    return r;
                }, []);
                return { questions };
            });
    }

    searchParticipantsIdentifiers(federatedCriteria) {
        if (federatedCriteria.length < 1) {
            return this.searchAllParticipants();
        }
        return this.federatedCriteriaToLocalCriteria(federatedCriteria)
            .then(criteria => this.searchParticipants(criteria));
    }

    countParticipantsIdentifiers(federatedCriteria) {
        if (federatedCriteria.length < 1) {
            return this.countAllParticipants();
        }
        return this.federatedCriteriaToLocalCriteria(federatedCriteria)
            .then(criteria => this.countParticipants(criteria));
    }

    federatedCountParticipants(federatedModels, criteria) {
        return this.registry.findRegistries()
            .then((registries) => {
                const promises = registries.map(({ name, schema, url }) => {
                    if (schema) {
                        const models = federatedModels[schema];
                        return models.answer.countParticipantsIdentifiers(criteria);
                    }
                    return registryCommon.requestPost(name, criteria, url, 'answers/identifier-queries');
                });
                return SPromise.all(promises);
            })
            .then(federated => this.countParticipantsIdentifiers(criteria)
                .then((local) => {
                    const count = federated.reduce((r, p) => r + p.count, local.count);
                    return { count };
                }));
    }
};
