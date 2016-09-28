'use strict';

const _ = require('lodash');

const RRError = require('../lib/rr-error');

module.exports = function (sequelize, DataTypes) {
    const Survey = sequelize.define('survey', {
        name: {
            type: DataTypes.TEXT
        },
        version: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        groupId: {
            type: DataTypes.INTEGER,
            field: 'group_id'
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
        },
        released: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            field: 'updated_at',
        },
        deletedAt: {
            type: DataTypes.DATE,
            field: 'deleted_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        deletedAt: 'deletedAt',
        classMethods: {
            createNewQuestionsTx: function (questions, tx) {
                const newQuestions = questions.reduce(function (r, { content }, index) {
                    if (content) {
                        r.push({ content, index });
                    }
                    return r;
                }, []);
                if (newQuestions.length) {
                    return sequelize.Promise.all(newQuestions.map(function (q) {
                            return sequelize.models.question.createQuestionTx(q.content, tx).then(function (id) {
                                questions[q.index] = { id };
                            });
                        }))
                        .then(() => questions);
                } else {
                    return sequelize.Promise.resolve(questions);
                }
            },
            updateQuestionsTx: function (inputQxs, surveyId, tx) {
                if (inputQxs && inputQxs.length) {
                    const questions = inputQxs.slice();
                    return Survey.createNewQuestionsTx(questions, tx)
                        .then((questions) => {
                            return sequelize.Promise.all(questions.map(function ({ id: questionId }, line) {
                                return sequelize.models.survey_question.create({
                                    questionId,
                                    surveyId,
                                    line
                                }, {
                                    transaction: tx
                                });
                            }));
                        });
                } else {
                    return sequelize.Promise.resolve(null);
                }
            },
            createSurveyTx: function (survey, tx) {
                const { name, released } = survey;
                return Survey.create({ name, released, version: 1 }, { transaction: tx })
                    .then((created) => {
                        // TODO: Find a way to use postgres sequences instead of update
                        return created.update({ groupId: created.id }, { transaction: tx });
                    })
                    .then(function ({ id }) {
                        return Survey.updateQuestionsTx(survey.questions, id, tx)
                            .then(() => id);
                    });
            },
            createSurvey: function (survey) {
                return sequelize.transaction(function (tx) {
                    return Survey.createSurveyTx(survey, tx);
                });
            },
            updateSurvey: function (id, { name }) {
                return Survey.findById(id)
                    .then(survey => survey.update({ name }))
                    .then(() => ({}));
            },
            listSurveys: function () {
                return Survey.findAll({ raw: true, attributes: ['id', 'name', 'released'], order: 'id' });
            },
            getSurvey: function (where) {
                return Survey.find({ where, raw: true, attributes: ['id', 'name', 'released'] })
                    .then(function (survey) {
                        if (!survey) {
                            return RRError.reject('surveyNotFound');
                        }
                        return sequelize.models.survey_question.findAll({
                                where: { surveyId: survey.id },
                                raw: true,
                                attributes: ['questionId']
                            })
                            .then(result => {
                                const questionIds = _.map(result, 'questionId');
                                return sequelize.models.question.getQuestions(questionIds);
                            })
                            .then(questions => {
                                survey.questions = questions;
                                return survey;
                            });
                    });
            },
            getSurveyById: function (id) {
                return Survey.getSurvey({ id });
            },
            getSurveyByName: function (name) {
                return Survey.getSurvey({ name });
            },
            getAnsweredSurvey: function (surveyPromise, userId) {
                return surveyPromise
                    .then(function (survey) {
                        return sequelize.models.answer.getAnswers({
                                userId,
                                surveyId: survey.id
                            })
                            .then(function (answers) {
                                const qmap = _.keyBy(survey.questions, 'id');
                                answers.forEach(answer => {
                                    const qid = answer.questionId;
                                    const question = qmap[qid];
                                    question.answer = answer.answer;
                                });
                                return survey;
                            });
                    });
            },
            getAnsweredSurveyById: function (userId, id) {
                const p = Survey.getSurveyById(id);
                return Survey.getAnsweredSurvey(p, userId);
            },
            getAnsweredSurveyByName: function (userId, name) {
                const p = Survey.getSurveyByName(name);
                return Survey.getAnsweredSurvey(p, userId);
            }
        }
    });

    return Survey;
};
