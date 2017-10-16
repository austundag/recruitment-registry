'use strict';

const _ = require('lodash');

const Base = require('./base');
const RRError = require('../../lib/rr-error');
const logger = require('../../logger');
const SPromise = require('../../lib/promise');
const queryrize = require('../../lib/queryrize');

const answerCommon = require('./answer-common');
const registryCommon = require('./registry-common');

const ExportCSVConverter = require('../../export/csv-converter.js');
const ImportCSVConverter = require('../../import/csv-converter.js');

const fedQxChoiceQuery = queryrize.readQuerySync('federated-question-choice-select.sql');
const copySqlQuery = queryrize.readQuerySync('copy-answers.sql');

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

const integerRangeCondition = function (min, max) {
    const minValue = min ? parseInt(min, 10) : null;
    const maxValue = max ? parseInt(max, 10) : null;
    if (max && min) {
        return { $gt: minValue, $lt: maxValue };
    }
    if (max) {
        return { $lt: maxValue };
    }
    return { $gt: minValue };
};

const searchParticipantConditionMaker = {
    integer(dao, answer) {
        const value = answer.value;
        if (value.indexOf(':') < 0) {
            return { value };
        }
        const [min, max] = value.split(':');
        const qColName = dao.qualifiedCol('answer', 'value');
        const col = dao.db.sequelize.col(qColName);
        const fn = dao.db.sequelize.fn('TO_NUMBER', col, '99999');
        const condition = integerRangeCondition(min, max);
        return { value: dao.db.sequelize.where(fn, condition) };
    },
    text(dao, answer) {
        return { value: answer.value };
    },
    choices(dao, answer) {
        if (answer.value) {
            return {
                value: answer.value,
                question_choice_id: answer.questionChoiceId,
            };
        }
        return { question_choice_id: answer.questionChoiceId };
    },
    choice(dao, answer) {
        return { question_choice_id: answer.questionChoiceId };
    },
    choiceRef(dao, answer) {
        return { question_choice_id: answer.questionChoiceId };
    },
};

module.exports = class AnswerDAO extends Base {
    constructor(db, dependencies) {
        super(db);
        Object.assign(this, dependencies);
    }

    saveFiles(userId, answers, transaction) {
        if (answers.length < 1) {
            return answers;
        }
        const fileValues = answers.reduce((r, p) => {
            if (p.answers) {
                p.answers.forEach((answer) => {
                    const fileValue = answer.fileValue;
                    if (fileValue && fileValue.content) {
                        r.push(fileValue);
                    }
                });
                return r;
            }
            if (p.answer) {
                const fileValue = p.answer.fileValue;
                if (fileValue && fileValue.content) {
                    r.push(fileValue);
                }
            }
            return r;
        }, []);
        if (fileValues.length < 1) {
            return answers;
        }
        const records = fileValues.map((fileValue) => {
            const content = new Buffer(fileValue.content, 'base64');
            return { userId, name: fileValue.name, content };
        });
        return this.db.File.bulkCreate(records, { transaction, returning: true })
            .then(result => result.forEach(({ id }, index) => {
                fileValues[index].id = id;
                delete fileValues[index].content;
            }))
            .then(() => answers);
    }


    fileAnswer({ userId, surveyId, assessmentId, language, answers }, transaction) {
        const Answer = this.db.Answer;
        const records = answers.reduce((r, p) => {
            const questionId = p.questionId;
            const dbValues = answerCommon.prepareAnswerForDB(p.answer || p.answers);
            dbValues.forEach((v) => {
                const mndx = v.multipleIndex;
                const value = {
                    userId,
                    surveyId,
                    assessmentId,
                    language,
                    questionId,
                    questionChoiceId: v.questionChoiceId || null,
                    fileId: v.fileId || null,
                    multipleIndex: (mndx || mndx === 0) ? mndx : null,
                    value: 'value' in v ? v.value : null,
                };
                r.push(value);
            });
            return r;
        }, []);
        return Answer.bulkCreate(records, { transaction });
    }

    updateStatus({ userId, surveyId }, status, transaction) {
        const UserSurvey = this.db.UserSurvey;
        return UserSurvey.findOne({
            where: { userId, surveyId },
            raw: true,
            attributes: ['status'],
            transaction,
        })
            .then((userSurvey) => {
                const record = Object.assign({ status }, { userId, surveyId });
                if (!userSurvey) {
                    return UserSurvey.create(record, { transaction });
                } else if (userSurvey.status !== status) {
                    return UserSurvey.destroy({ where: { userId, surveyId }, transaction })
                        .then(() => UserSurvey.create(record, { transaction }));
                }
                return null;
            });
    }

    validateConsent({ userId, surveyId }, action, transaction) {
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

    validateAnswers(masterIndex, answers, status) {
        const Answer = this.db.Answer;
        const surveyId = masterIndex.surveyId;
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
                        const where = Object.assign({ questionId: { $in: ids } }, masterIndex);
                        return Answer.findAll({
                            raw: true,
                            where,
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

    validateCreate(masterIndex, answers, status, transaction) {
        return this.validateAnswers(masterIndex, answers, status)
            .then(() => this.validateConsent(masterIndex, 'create', transaction));
    }

    getMasterIndex(inputRecord, transaction) {
        const { userId, surveyId, assessmentId } = inputRecord;
        if (!assessmentId) {
            return SPromise.resolve({ userId, surveyId, assessmentId: null });
        }
        const where = { assessmentId };
        const attributes = ['surveyId'];
        return this.db.AssessmentSurvey.findAll({ where, raw: true, attributes, transaction })
            .then(result => result.map(r => r.surveyId))
            .then((surveyIds) => {
                if (!surveyId) {
                    if (surveyIds.length === 1) {
                        return surveyIds[0];
                    }
                    return RRError.reject('answerInvalidAssesSurveys');
                }
                if (surveyIds.indexOf(surveyId) >= 0) {
                    return surveyId;
                }
                return RRError.reject('answerInvalidSurveyInAsses');
            })
            .then(validSurveyId => ({ userId, surveyId: validSurveyId, assessmentId }));
    }

    createAnswersTx(inputRecord, transaction) {
        const answers = _.cloneDeep(inputRecord.answers);
        const status = inputRecord.status || 'completed';
        return this.getMasterIndex(inputRecord, transaction)
            .then(masterIndex => this.validateCreate(masterIndex, answers, status, transaction)
                .then(() => this.updateStatus(masterIndex, status, transaction))
                .then(() => {
                    const ids = _.map(answers, 'questionId');
                    const where = { questionId: { $in: ids } };
                    if (masterIndex.assessmentId) {
                        where.assessmentId = masterIndex.assessmentId;
                    } else {
                        where.userId = masterIndex.userId;
                        where.surveyId = masterIndex.surveyId;
                    }
                    return this.db.Answer.destroy({ where, transaction });
                })
                .then(() => {
                    const filteredAnswers = _.filter(answers, r => r.answer || r.answers);
                    return filteredAnswers;
                })
                .then((filteredAnswers) => {
                    const userId = masterIndex.userId;
                    return this.saveFiles(userId, filteredAnswers, transaction);
                })
                .then((filteredAnswers) => {
                    if (filteredAnswers.length) {
                        const language = inputRecord.language || 'en';
                        const record = { language, answers: filteredAnswers };
                        Object.assign(record, masterIndex);
                        return this.fileAnswer(record, transaction);
                    }
                    return null;
                }));
    }

    copyAnswersTx(inputRecord, transaction) {
        const status = inputRecord.status || 'completed';
        return this.getMasterIndex(inputRecord, transaction)
            .then(masterIndex => this.validateConsent(masterIndex, 'create', transaction)
                .then(() => this.updateStatus(masterIndex, status, transaction))
                .then(() => {
                    const where = {};
                    if (masterIndex.assessmentId) {
                        where.assessmentId = masterIndex.assessmentId;
                    } else {
                        where.userId = masterIndex.userId;
                        where.surveyId = masterIndex.surveyId;
                    }
                    return this.db.Answer.destroy({ where, transaction });
                })
                .then(() => {
                    const { userId, assessmentId, prevAssessmentId } = inputRecord;
                    const params = {
                        user_id: userId,
                        assessment_id: assessmentId,
                        prev_assessment_id: prevAssessmentId,
                    };
                    return this.query(copySqlQuery, params, transaction);
                }));
    }

    createAnswers(input) {
        return this.transaction(tx => this.createAnswersTx(input, tx));
    }

    copyAnswers(input) {
        return this.transaction(tx => this.copyAnswersTx(input, tx));
    }

    listAnswers({ userId, surveyId, assessmentId, scope, history, ids, userIds }) {
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
        if (assessmentId) {
            where.assessmentId = assessmentId;
        }
        if (scope === 'history-only') {
            where.deletedAt = { $ne: null };
        }
        const attributes = ['questionChoiceId', 'fileId', 'language', 'multipleIndex', 'value'];
        if (scope === 'export' || !surveyId) {
            attributes.push('surveyId');
        }
        if (scope === 'history-only') {
            attributes.push(this.timestampColumn('answer', 'deleted', 'SSSS.MS'));
        }
        if (userIds || assessmentId) {
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

    getAnswers(masterIndex) {
        return this.validateConsent(masterIndex, 'read')
            .then(() => this.listAnswers(masterIndex));
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

        return this.db.Question.findAll({
            where: { id: { $in: questionIds } },
            raw: true,
            attributes: ['id', 'type'],
        })
            .then(records => new Map(records.map(r => [r.id, r.type])))
            .then((typeMap) => {
                // find answers that match one of the search criteria
                const where = { $or: [] };
                criteria.questions.forEach((question) => {
                    const qxConds = [];
                    answerCommon.prepareFilterAnswersForDB(question.answers).forEach((answer) => {
                        const type = typeMap.get(question.id);
                        const conditionMaker = searchParticipantConditionMaker[_.camelCase(type)];
                        let qxCond;
                        if (conditionMaker) {
                            qxCond = conditionMaker(this, answer);
                        } else {
                            const value = ('value' in answer) ? answer.value : null;
                            qxCond = { value };
                        }
                        qxConds.push(qxCond);
                    });
                    let qxCondsAll = qxConds.length > 1 ? { $or: qxConds } : qxConds[0];
                    if (question.exclude) {
                        qxCondsAll = { $not: qxCondsAll };
                    }
                    const condition = Object.assign({ question_id: question.id }, qxCondsAll);
                    where.$or.push(condition);
                });

                // find users with a matching answer for each question
                // (i.e., users who match all criteria)
                const include = [{ model: this.db.User, as: 'user', attributes: [] }];
                const having = this.where(this.literal('COUNT(DISTINCT(question_id))'), n);
                const group = ['user_id'];

                // count resulting users
                const attributes = ['userId'];
                const options = { raw: true, where, attributes, include, having, group };
                return this.db.Answer.findAll(options);
            });
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
    countParticipants(criteria, federatedModels) {
        if (criteria.federated) {
            return this.localCriteriaToFederatedCriteria(criteria)
                .then(fc => this.federatedCountParticipants(federatedModels, fc));
        }

        // if criteria is empty, return count of all users
        if (!_.get(criteria, 'questions.length')) {
            return this.countAllParticipants();
        }

        return this.searchParticipants(criteria)
            .then(results => ({ count: results.length }));
    }

    federatedCriteriaToLocalCriteria(federatedCriteria) {
        const identifiers = federatedCriteria.reduce((r, { identifier }) => {
            if (identifier) {
                r.push(identifier);
            }
            return r;
        }, []);
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { identifier: { $in: identifiers }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                const identifierMap = new Map(records.map(r => [r.identifier, r]));
                const texts = federatedCriteria.map(r => r.questionText);
                const sequelize = this.db.sequelize;
                const fn = sequelize.fn('lower', sequelize.col('text'));
                const where = sequelize.where(fn, { $in: texts });
                return this.db.QuestionText.findAll({
                    where, raw: true, attributes: ['questionId', 'text'],
                })
                    .then((qRecords) => {
                        const questionMap = new Map(qRecords.map(r => [r.text, r.questionId]));
                        return { questionMap, identifierMap, records };
                    });
            })
            .then(({ identifierMap, questionMap }) => {
                const qxids = [...questionMap.values()];
                const texts = federatedCriteria.reduce((r, p) => {
                    const text = p.questionChoiceText;
                    if (text) {
                        r.push(`'${text}'`);
                    }
                    return r;
                }, []);
                const replacements = {
                    qxids: `(${qxids.join(', ')})`,
                    texts: `(${texts.join(', ')})`,
                };
                const query = queryrize.replaceParameters(fedQxChoiceQuery, replacements);
                return this.selectQuery(query, replacements)
                    .then((result) => {
                        const choiceMap = result.reduce((r, p) => {
                            let choices = r.get(p.questionId);
                            if (!choices) {
                                choices = new Map();
                                r.set(p.questionId, choices);
                            }
                            choices.set(p.choiceText, p.questionChoiceId);
                            return r;
                        }, new Map());
                        return choiceMap;
                    })
                    .then(choiceMap => ({ identifierMap, questionMap, choiceMap }));
            })
            .then(({ identifierMap, questionMap, choiceMap }) => {
                const runnningMap = new Map();
                const questions = federatedCriteria.reduce((r, criterion) => {
                    const { identifier, questionText, questionChoiceText, exclude } = criterion;
                    let { questionId, questionChoiceId } = identifierMap.get(identifier) || {};
                    if (!questionId) {
                        questionId = questionMap.get(questionText);
                        if (!questionId) {
                            logger.error(`Question '${questionText}' does not exists.`);
                            return r;
                        }
                    }
                    if (!questionChoiceId && questionChoiceText) {
                        const choices = choiceMap.get(questionId);
                        if (!choices) {
                            logger.error(`Question ('${questionText}') does not have choices.`);
                            return r;
                        }
                        questionChoiceId = choices.get(questionChoiceText);
                        if (!questionChoiceId) {
                            logger.error(`Question '${questionText}' does not have choice '${questionChoiceText}'.`);
                            return r;
                        }
                    }
                    let qx = runnningMap.get(questionId);
                    if (!qx) {
                        qx = { id: questionId, answers: [] };
                        if (exclude) {
                            qx.exclude = true;
                        }
                        runnningMap.set(questionId, qx);
                        r.push(qx);
                    }
                    const answer = _.omit(criterion, ['identifier', 'questionText', 'questionChoiceText', 'exclude']);
                    if (questionChoiceId) {
                        answer.choice = questionChoiceId;
                    }
                    qx.answers.push(answer);
                    return r;
                }, []);
                return { questions };
            });
    }

    localCriteriaToFederatedCriteria({ questions }) {
        const questionIds = questions.map(({ id }) => id);
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { questionId: { $in: questionIds }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                const identifierMap = records.reduce((r, record) => {
                    const { identifier, questionId, questionChoiceId } = record;
                    if (questionChoiceId) {
                        let identifiers = r.get(questionId);
                        if (!identifiers) {
                            identifiers = new Map();
                            r.set(questionId, identifiers);
                        }
                        identifiers.set(questionChoiceId, identifier);
                        return r;
                    }
                    r.set(questionId, identifier);
                    return r;
                }, new Map());
                return { identifierMap };
            })
            .then(({ identifierMap }) => {
                const qxIds = questions.map(q => q.id);
                if (qxIds.length) {
                    return this.db.QuestionText.findAll({
                        raw: true,
                        where: { questionId: { $in: qxIds } },
                        attributes: ['questionId', 'text'],
                    })
                        .then((r) => {
                            const qxMap = new Map(r.map(p => [
                                p.questionId, p.text.toLowerCase(),
                            ]));
                            return { identifierMap, qxMap };
                        });
                }
                return { identifierMap, qxMap: new Map() };
            })
            .then(({ identifierMap, qxMap }) => {
                const qxChoiceIds = questions.reduce((r, { answers }) => {
                    answers.forEach((answer) => {
                        const choice = answer.choice;
                        if (choice) {
                            r.push(choice);
                        }
                    });
                    return r;
                }, []);
                if (qxChoiceIds.length) {
                    return this.db.QuestionChoiceText.findAll({
                        raw: true,
                        where: { questionChoiceId: { $in: qxChoiceIds } },
                        attributes: ['questionChoiceId', 'text'],
                    })
                        .then((r) => {
                            const qxChoiceMap = new Map(r.map(p => [
                                p.questionChoiceId, p.text.toLowerCase(),
                            ]));
                            return { identifierMap, qxMap, qxChoiceMap };
                        });
                }
                return { identifierMap, qxMap, qxChoiceMap: new Map() };
            })
            .then(({ identifierMap, qxMap, qxChoiceMap }) => questions.reduce((r, { id, exclude, answers }) => { // eslint-disable-line max-len
                const identifierInfo = identifierMap.get(id);
                const questionText = qxMap.get(id);
                answers.forEach((answer) => {
                    const e = { questionText };
                    if (exclude) {
                        e.exclude = true;
                    }
                    if (answer.choice) {
                        e.questionChoiceText = qxChoiceMap.get(answer.choice);
                        if (identifierInfo) {
                            const identifier = identifierInfo.get(answer.choice);
                            if (identifier) {
                                e.identifier = identifier;
                            }
                        }
                        Object.assign(e, _.omit(answer, 'choice'));
                    } else {
                        if (identifierInfo) {
                            e.identifier = identifierInfo;
                        }
                        Object.assign(e, answer);
                    }
                    r.push(e);
                });
                return r;
            }, []));
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

    fillAnswerIdentifiers(answers) {
        const questionIds = answers.map(r => r.questionId);
        const questionIdSet = new Set(questionIds);
        const uniqQuestionIds = [...questionIdSet];
        return this.db.AnswerIdentifier.findAll({
            raw: true,
            where: { questionId: { $in: uniqQuestionIds }, type: 'federated' },
            attributes: ['identifier', 'questionId', 'questionChoiceId'],
        })
            .then((records) => {
                if (records.length === 0) {
                    return new Map();
                }
                return records.reduce((r, record) => {
                    const { identifier, questionId, questionChoiceId } = record;
                    if (questionChoiceId) {
                        let choiceMap = r.get(questionId);
                        if (!choiceMap) {
                            choiceMap = new Map();
                            r.set(questionId, choiceMap);
                        }
                        choiceMap.set(questionChoiceId, identifier);
                        return r;
                    }
                    r.set(questionId, identifier);
                    return r;
                }, new Map());
            })
            .then(identifierMap => answers.map((answer) => {
                const { questionId, questionChoiceId } = answer;
                const e = _.cloneDeep(answer);
                const identifierInfo = identifierMap.get(questionId);
                if (!identifierInfo) {
                    return e;
                }
                if (questionChoiceId) {
                    const identifier = identifierInfo.get(questionChoiceId);
                    if (identifier) {
                        return Object.assign({ identifier }, e);
                    }
                } else {
                    const identifier = identifierInfo;
                    return Object.assign({ identifier }, e);
                }
                return e;
            }));
    }

    federatedListAnswers(federatedCriteria) {
        return this.searchParticipantsIdentifiers(federatedCriteria)
            .then(userIds => userIds.map(({ userId }) => userId))
            .then(userIds => this.listAnswers({ userIds, scope: 'export' }))
            .then(answers => this.fillAnswerIdentifiers(answers, federatedCriteria))
            .then((answers) => {
                if (answers.length === 0) {
                    return answers;
                }
                const questionIds = answers.map(r => r.questionId);
                const questionIdSet = new Set(questionIds);
                const uniqQuestionIds = [...questionIdSet];
                return this.db.QuestionText.findAll({
                    raw: true,
                    where: { questionId: { $in: uniqQuestionIds }, language_code: 'en' },
                    attributes: ['questionId', 'text'],
                })
                    .then((records) => {
                        const map = new Map(records.map(r => [r.questionId, r.text]));
                        answers.forEach((r) => {
                            r.questionText = map.get(r.questionId);
                            delete r.questionId;
                            delete r.questionType;
                            delete r.choiceType;
                            delete r.surveyId;
                        });
                        return answers;
                    });
            })
            .then((answers) => {
                if (answers.length === 0) {
                    return answers;
                }
                const questionChoiceIds = answers.reduce((r, { questionChoiceId }) => {
                    if (questionChoiceId) {
                        r.push(questionChoiceId);
                    }
                    return r;
                }, []);
                if (questionChoiceIds.length === 0) {
                    return answers;
                }
                return this.db.QuestionChoiceText.findAll({
                    raw: true,
                    where: { questionChoiceId: { $in: questionChoiceIds }, language_code: 'en' },
                    attributes: ['questionChoiceId', 'text'],
                })
                    .then((records) => {
                        const map = new Map(records.map(r => [r.questionChoiceId, r.text]));
                        answers.forEach((r) => {
                            if (r.questionChoiceId) {
                                r.questionChoiceText = map.get(r.questionChoiceId);
                            }
                            delete r.questionChoiceId;
                        });
                        return answers;
                    });
            });
    }
};
