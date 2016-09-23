/* global describe,before,it*/
'use strict';

const chai = require('chai');
const _ = require('lodash');

const models = require('../../models');
const shared = require('../shared-spec');
const jsutil = require('../../lib/jsutil');

const expect = chai.expect;

describe('answer unit', function () {
    before(shared.setUpFn());

    const store = {
        users: [],
        questions: [],
        qxChoices: [],
        surveys: [],
        hxAnswers: {}
    };

    for (let i = 0; i < 4; ++i) {
        it(`create user ${i}`, shared.createUser(store));
    }

    for (let i = 0; i < 20; ++i) {
        it(`create question ${i}`, shared.createQuestion(store));
    }

    const testQuestions = [{
        survey: [0, 1, 2, 3, 4],
        answerSequences: [
            [
                [0, 1, 2, 3, 4],
                [0, 1, 2, 3, 4],
                [-1, -2]
            ]
        ]
    }, {
        survey: [4, 5, 6, 0],
        answerSequences: [
            [
                [4, 5, 6, 0],
                [4, -6],
                [6, 0]
            ]
        ]
    }, {
        survey: [7, 8, 9, 10, 11, 12],
        answerSequences: [
            [
                [8, 10, 11, 12],
                [7, 10, -12],
                [9, 10, 11, -8]
            ]
        ]
    }, {
        survey: [9, 11, 13, 6],
        answerSequences: [
            [
                [9, 13],
                [6, 11],
                [-9, 11]
            ],
            [
                [9, 11, 13, 6],
                [9, 11, -6],
                [11, 13]
            ]
        ]
    }, {
        survey: [14, 15, 16, 17, 18, 19],
        answerSequences: [
            [
                [14, 15, 16, 17, 18, 19],
                [-15, 16, -17, -19],
                [14, 17, 19]
            ]
        ]
    }];

    _.map(testQuestions, 'survey').forEach((surveyQuestion, index) => {
        return it(`create survey ${index}`, shared.createSurvey(store, surveyQuestion));
    });

    const genQuestionAnswer = (function () {
        let answerIndex = -1;
        let choicesCountIndex = 0;

        const genAnswer = {
            text: function (question) {
                ++answerIndex;
                return {
                    questionId: question.id,
                    answer: {
                        textValue: `text_${answerIndex}`
                    }
                };
            },
            bool: function (question) {
                ++answerIndex;
                return {
                    questionId: question.id,
                    answer: {
                        boolValue: answerIndex % 2 === 0
                    }
                };
            },
            choice: function (question) {
                ++answerIndex;
                return {
                    questionId: question.id,
                    answer: {
                        choice: question.choices[answerIndex % question.choices.length]
                    }
                };
            },
            choices: function (question) {
                ++answerIndex;
                choicesCountIndex = (choicesCountIndex + 1) % 3;
                const choices = _.range(choicesCountIndex + 1).map(function () {
                    ++answerIndex;
                    return question.choices[answerIndex % question.choices.length];
                });

                return {
                    questionId: question.id,
                    answer: {
                        choices: _.sortBy(choices)
                    }
                };
            },
            choicesplus: function (question) {
                const result = this.choices(question);
                result.answer.textValue = `text_${answerIndex}`;
                return result;
            }
        };

        return function (questionIndex) {
            if (questionIndex < 0) {
                const question = store.questions[-questionIndex];
                return {
                    questionId: question.id
                };
            } else {
                const question = store.questions[questionIndex];
                return genAnswer[question.type](question);
            }
        };
    })();

    const updateHxAnswers = function (key, qxIndices, answers) {
        const hx = store.hxAnswers[key] || (store.hxAnswers[key] = []);
        const qxAnswers = answers.reduce((r, answer, index) => {
            const qxIndex = qxIndices[index];
            if (qxIndex >= 0) {
                r[qxIndex] = answer;
            }
            return r;
        }, {});
        hx.push({ qxIndices, qxAnswers });
    };

    const createTestFn = function (userIndex, surveyIndex, qxIndices, key) {
        return function () {
            const answers = qxIndices.map(genQuestionAnswer);
            updateHxAnswers(key, qxIndices, answers);
            const input = {
                userId: store.users[userIndex],
                surveyId: store.surveys[surveyIndex],
                answers
            };
            return models.Answer.createAnswers(input)
                .then(function () {
                    return models.Answer.getSurveyAnswers({
                            userId: store.users[userIndex],
                            surveyId: store.surveys[surveyIndex]
                        })
                        .then(function (result) {
                            const expected = _.sortBy(answers, 'questionId');
                            const actual = _.sortBy(result, 'questionId');
                            expect(actual).to.deep.equal(expected);
                        });
                });
        };
    };

    it('user 0 answers survey 0 1st time', createTestFn(0, 0, testQuestions[0].answerSequences[0][0], 'a'));
    it('user 1 answers survey 1 1st time', createTestFn(1, 1, testQuestions[1].answerSequences[0][0], 'b'));
    it('user 2 answers survey 2 1st time', createTestFn(2, 2, testQuestions[2].answerSequences[0][0], 'c'));
    it('user 3 answers survey 3 1st time', createTestFn(3, 3, testQuestions[3].answerSequences[0][0], 'd'));
    it('user 2 answers survey 4 1st time', createTestFn(2, 4, testQuestions[4].answerSequences[0][0], 'e'));
    it('user 0 answers survey 3 1st time', createTestFn(0, 3, testQuestions[3].answerSequences[1][0], 'f'));

    const pullExpectedAnswers = function (key) {
        const answersSpec = store.hxAnswers[key];
        const standing = jsutil.findStanding(_.map(answersSpec, 'qxIndices'));
        return standing.reduce((r, answerIndices, index) => {
            answerIndices.forEach((answerIndex) => {
                const answer = answersSpec[index].qxAnswers[answerIndex];
                r.push(answer);
            });
            return r;
        }, []);
    };

    const updateTestFn = function (userIndex, surveyIndex, qxIndices, key) {
        return function () {
            const answers = qxIndices.map(genQuestionAnswer);
            updateHxAnswers(key, qxIndices, answers);
            const input = {
                userId: store.users[userIndex],
                surveyId: store.surveys[surveyIndex],
                answers
            };
            return models.Answer.updateAnswers(input)
                .then(function () {
                    return models.Answer.getSurveyAnswers({
                            userId: store.users[userIndex],
                            surveyId: store.surveys[surveyIndex]
                        })
                        .then(function (result) {
                            const expectedAnswers = pullExpectedAnswers(key);
                            const expected = _.sortBy(expectedAnswers, 'questionId');
                            const actual = _.sortBy(result, 'questionId');
                            expect(actual).to.deep.equal(expected);
                        });
                });
        };
    };

    it('user 0 answers survey 0 2nd time', updateTestFn(0, 0, testQuestions[0].answerSequences[0][1], 'a'));
    it('user 1 answers survey 1 2nd time', updateTestFn(1, 1, testQuestions[1].answerSequences[0][1], 'b'));
    it('user 2 answers survey 2 2nd time', updateTestFn(2, 2, testQuestions[2].answerSequences[0][1], 'c'));
    it('user 3 answers survey 3 2nd time', updateTestFn(3, 3, testQuestions[3].answerSequences[0][1], 'd'));
    it('user 2 answers survey 4 2nd time', updateTestFn(2, 4, testQuestions[4].answerSequences[0][1], 'e'));
    it('user 0 answers survey 3 2nd time', updateTestFn(0, 3, testQuestions[3].answerSequences[1][1], 'f'));

    it('user 0 answers survey 0 3rd time', updateTestFn(0, 0, testQuestions[0].answerSequences[0][2], 'a'));
    it('user 1 answers survey 1 3rd time', updateTestFn(1, 1, testQuestions[1].answerSequences[0][2], 'b'));
    it('user 2 answers survey 2 3rd time', updateTestFn(2, 2, testQuestions[2].answerSequences[0][2], 'c'));
    it('user 3 answers survey 3 3rd time', updateTestFn(3, 3, testQuestions[3].answerSequences[0][2], 'd'));
    it('user 2 answers survey 4 3rd time', updateTestFn(2, 4, testQuestions[4].answerSequences[0][2], 'e'));
    it('user 0 answers survey 3 3rd time', updateTestFn(0, 3, testQuestions[3].answerSequences[1][2], 'f'));
});
