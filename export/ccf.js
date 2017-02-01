'use strict';

const _ = require('lodash');

const models = require('../models');
const SPromise = require('../lib/promise');

const cHash = 'objectId (Hash Tag Used for Questions)';
const cConditional = 'conditional (Answer Hash Tag used with skipCount to skip next question if certain answer is picked)';
const cAnswerHash = 'hash (Hash Tag Used for Answers)';
const cSkipCount = 'skipCount (Number of Questions Skipped if Contitional answer is picked)';

const identifierType = 'ccf';

const exportSurveys = function () {
    return models.survey.listSurveys({ scope: 'id-only' })
        .then(ids => {
            return SPromise.all(ids.map(id => models.survey.getSurvey(id)))
                .then(surveys => models.surveyIdentifier.updateSurveysWithIdentifier(surveys, identifierType));
        })
        .then(surveys => {
            const ids = surveys.reduce((r, survey) => {
                survey.questions.forEach(question => r.push(question.id));
                return r;
            }, []);
            return models.questionIdentifier.getInformationByQuestionId(identifierType, ids)
                .then(questionIdentifierMap => {
                    return models.answerIdentifier.getAnswerIdsToIdentifierMap(identifierType)
                        .then(answerIdentifierMap => ({ surveys, questionIdentifierMap, answerIdentifierMap }));
                });
        })
        .then(({ surveys, questionIdentifierMap, answerIdentifierMap }) => {
            let index = 0;
            const exportedQuestions = surveys.reduce((r, survey) => {
                r.push({ number: survey.name });
                survey.questions.forEach(question => {
                    ++index;
                    let line = {
                        number: index.toString(),
                        question: question.text,
                        [cHash]: questionIdentifierMap[question.id].identifier
                    };
                    const instruction = question.instruction;
                    if (instruction) {
                        line.instruction = instruction;
                    }
                    const skip = question.skip;
                    if (skip) {
                        line[cSkipCount] = skip.count;
                        line[cConditional] = answerIdentifierMap[question.id + ':' + skip.rule.answer.choice].identifier;
                    }
                    const meta = question.meta;
                    if (meta) {
                        const answerType = meta.ccType;
                        if (answerType) {
                            line.answerType = answerType.toString();
                        }
                    }
                    const choices = question.choices;
                    if (!choices) {
                        const { identifier, tag } = answerIdentifierMap[question.id];
                        line[cAnswerHash] = identifier;
                        line.tag = tag;
                        r.push(line);
                        return;
                    }
                    const toggleQuestion = choices.find(({ type }) => (type === 'bool-sole'));
                    choices.forEach(choice => {
                        line.answer = choice.text;
                        const { identifier, tag } = answerIdentifierMap[question.id + ':' + choice.id];
                        line[cAnswerHash] = identifier;
                        line.tag = tag;
                        if (toggleQuestion) {
                            line.toggle = (choice.type === 'bool-sole' ? 'checkalloff' : 'checkthis');
                        }
                        r.push(line);
                        line = {};
                    });
                });
                return r;
            }, []);
            const exportedSurveys = surveys.reduce((r, survey) => {
                const meta = survey.meta;
                r.push({
                    id: survey.identifier,
                    isBHI: meta.isBHI ? 'true' : 'false',
                    maxScore: meta.maxScore,
                    title: survey.name
                });
                return r;
            }, []);
            return { questions: exportedQuestions, pillars: exportedSurveys };
        });
};

const exportAssessments = function () {
    return models.userAssessment.exportBulk()
        .then(records => records.map(record => {
            return {
                id: record.id,
                assessment_id: _.get(record, 'meta.key'),
                assessment_name: record['assessment.name'],
                updated_at: record.createdAt,
                hb_user_id: record.userId
            };
        }))
        .then(assessments => {
            const assessmentIdSet = new Set();
            assessments.forEach(({ id }) => assessmentIdSet.add(id));
            const ids = [...assessmentIdSet];
            return models.userAssessment.exportBulkAnswers(ids)
                .then(assesmentAnswers => {
                    const answerIdSet = new Set();
                    const assessmentAnswerMap = new Map();
                    assesmentAnswers.forEach(({ userAssessmentId, answerId }) => {
                        answerIdSet.add(answerId);
                        let answerIds = assessmentAnswerMap.get(userAssessmentId);
                        if (!answerIds) {
                            answerIds = [];
                            assessmentAnswerMap.set(userAssessmentId, answerIds);
                        }
                        answerIds.push(answerId);
                    });
                    const answerIds = [...answerIdSet];
                    return models.answer.exportBulk(answerIds)
                        .then(answers => {
                            const answerMap = new Map(answers.map(answer => [answer.id, answer]));
                            return assesmentAnswers.map(({ userAssessmentId, answerId }) => {
                                const answer = _.cloneDeep(answerMap.get(answerId));
                                answer.hb_assessment_id = userAssessmentId;
                                return answer;
                            });
                        })
                        .then(answers => {
                            const surveyIdSet = new Set();
                            answers.forEach(answer => surveyIdSet.add(answer.surveyId));
                            const ids = [...surveyIdSet];
                            return models.surveyIdentifier.getIdentifiersBySurveyId(identifierType, ids)
                                .then(surveyMap => {
                                    answers.forEach(answer => {
                                        answer.pillar_hash = surveyMap.get(answer.surveyId);
                                        delete answer.surveyId;
                                    });
                                    return answers;
                                });
                        })
                        .then(answers => {
                            const questionIdSet = new Set();
                            answers.forEach(answer => questionIdSet.add(answer.questionId));
                            return models.answerIdentifier.getMapByQuestionId(identifierType, [...questionIdSet])
                                .then(identifierMap => {
                                    return answers.reduce((r, answer) => {
                                        if (answer['question.type'] === 'choice') {
                                            const choiceId = answer.questionChoiceId;
                                            const identifierInfo = identifierMap.get(answer.questionId);
                                            identifierInfo.forEach(({ identifier, questionChoiceId }) => {
                                                const answerClone = _.cloneDeep(answer);
                                                answerClone.answer_hash = identifier;
                                                answerClone.boolean_value = (questionChoiceId === choiceId);
                                                answerClone.string_value = 'null';
                                                r.push(answerClone);
                                            });
                                            return r;
                                        }
                                        if (answer['question.type'] === 'choices') {
                                            const choiceId = answer.questionChoiceId;
                                            const identifierInfo = identifierMap.get(answer.questionId);
                                            answer.answer_hash = identifierInfo.get(choiceId);
                                            if (answer['questionChoice.type'] === 'bool' || answer['questionChoice.type'] === 'bool-sole') {
                                                answer.boolean_value = (answer.value === 'true');
                                                answer.string_value = 'null';
                                            } else {
                                                answer.boolean_value = 'null';
                                                answer.string_value = answer.value;
                                            }
                                            r.push(answer);
                                            return r;
                                        }
                                        answer.answer_hash = identifierMap.get(answer.questionId);
                                        if (answer['questionChoice.type'] === 'bool') {
                                            answer.boolean_value = (answer.value === 'true');
                                            answer.string_value = 'null';
                                        } else {
                                            answer.boolean_value = 'null';
                                            answer.string_value = answer.value;
                                        }
                                        r.push(answer);
                                        return r;
                                    }, []);
                                });
                        })
                        .then(answers => {
                            answers.forEach(answer => {
                                answer.updated_at = answer.createdAt;
                                answer.hb_user_id = answer.userId;
                                delete answer['question.type'];
                                delete answer['question.id'];
                                delete answer['questionChoice.type'];
                                delete answer.questionId;
                                delete answer.questionChoiceId;
                                delete answer.value;
                                delete answer.createdAt;
                                delete answer.userId;
                            });
                            return { assessments, answers };
                        });
                });
        });
};

module.exports = {
    exportSurveys,
    exportAssessments
};