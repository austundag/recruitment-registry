/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('lodash');

const models = require('../models');

const Generator = require('./util/entity-generator');
const History = require('./util/entity-history');
const SurveyHistory = require('./util/survey-history');
const SharedSpec = require('./util/shared-spec');
const comparator = require('./util/client-server-comparator');
const translator = require('./util/translator');
const surveyCommon = require('./util/survey-common');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedSpec(generator);

describe('survey unit', function () {
    before(shared.setUpFn());

    const userCount = 1;
    let surveyCount = 8;

    const hxSurvey = new SurveyHistory();
    const hxUser = new History();
    const tests = new surveyCommon.SpecTests(generator, hxSurvey);

    it('verify no surveys', function () {
        return models.survey.listSurveys()
            .then((surveys) => {
                expect(surveys).to.have.length(0);
            });
    });

    const verifyUpdatedSurveyFn = function (index) {
        return function () {
            const expected = hxSurvey.server(index);
            const surveyId = hxSurvey.id(index);
            return models.survey.getSurvey(surveyId)
                .then(survey => expect(survey).to.deep.equal(expected));
        };
    };

    const updateSurveyFn = function (index) {
        return function () {
            const surveyId = hxSurvey.id(index);
            const survey = hxSurvey.server(index);
            const update = { meta: { anyProperty: 2 } };
            Object.assign(survey, update);
            return models.survey.updateSurvey(surveyId, update);
        };
    };

    const revertUpdateSurveyFn = function (index) {
        return function () {
            const surveyId = hxSurvey.id(index);
            const survey = hxSurvey.server(index);
            let { meta } = hxSurvey.client(index);
            if (!meta) {
                delete survey.meta;
                meta = null;
            } else {
                Object.assign(survey, { meta });
            }
            return models.survey.updateSurvey(surveyId, { meta });
        };
    };

    const updateSurveyTextFn = function (index) {
        return function () {
            const id = hxSurvey.id(index);
            const survey = hxSurvey.server(index);
            survey.name = survey.name + 'xyz';
            const update = { id, name: survey.name };
            if (survey.description) {
                const newDescription = survey.description + 'zyx';
                survey.description = newDescription;
                update.description = newDescription;
            }
            return models.survey.updateSurveyText(update);
        };
    };

    const revertUpdateSurveyTextFn = function (index) {
        return function () {
            const id = hxSurvey.id(index);
            const survey = hxSurvey.server(index);
            let { name, description } = hxSurvey.client(index);
            survey.name = name;
            if (description) {
                survey.description = description;
            }
            return models.survey.updateSurveyText({ id, name, description });
        };
    };

    it('error: create survey without questions', function () {
        return models.survey.createSurvey({ name: 'name' })
            .then(shared.throwingHandler, shared.expectedErrorHandler('surveyNoQuestions'));
    });

    for (let i = 0; i < surveyCount; ++i) {
        it(`create survey ${i}`, tests.createSurveyFn());
        it(`get survey ${i}`, tests.getSurveyFn(i));
        it(`update survey ${i}`, updateSurveyFn(i));
        it(`get/verify survey ${i}`, verifyUpdatedSurveyFn(i));
        it(`revert updated survey back ${i}`, revertUpdateSurveyFn(i));
        it(`get/verify survey ${i}`, verifyUpdatedSurveyFn(i));
        it(`update survey text ${i}`, updateSurveyTextFn(i));
        it(`get/verify survey ${i}`, verifyUpdatedSurveyFn(i));
        it(`revert updated survey text back ${i}`, revertUpdateSurveyTextFn(i));
        it(`get/verify survey ${i}`, verifyUpdatedSurveyFn(i));
        it('list surveys', tests.listSurveysFn());
    }

    it('replace sections of first survey with sections', function () {
        const index = _.findIndex(hxSurvey.listClients(), client => client.sections);
        const survey = hxSurvey.server(index);
        const count = survey.questions.length;
        const newSectionCount = (count - count % 2) / 2;
        const newSections = [{
            name: 'new_section_0',
            indices: _.range(newSectionCount)
        }, {
            name: 'new_section_1',
            indices: _.rangeRight(newSectionCount, newSectionCount * 2)
        }];
        const clientSurvey = hxSurvey.client(index);
        clientSurvey.sections = newSections;
        hxSurvey.updateClient(index, clientSurvey);
        return models.survey.replaceSurveySections(survey.id, newSections);
    });

    it('get/verify sections of first survey with sections', function () {
        const index = _.findIndex(hxSurvey.listClients(), client => client.sections);
        const id = hxSurvey.id(index);
        return models.survey.getSurvey(id)
            .then(survey => {
                const clientSurvey = hxSurvey.client(index);
                comparator.survey(clientSurvey, survey);
                hxSurvey.updateServer(index, survey);
            });
    });

    it('error: show a non-existent survey', function () {
        return models.survey.getSurvey(999)
            .then(shared.throwingHandler, shared.expectedErrorHandler('surveyNotFound'));
    });

    it('error: replace with a survey with no questions', function () {
        const survey = hxSurvey.server(1);
        const replacementSurvey = generator.newSurvey();
        delete replacementSurvey.questions;
        return models.survey.replaceSurvey(survey.id, replacementSurvey)
            .then(shared.throwingHandler, shared.expectedErrorHandler('surveyNoQuestions'));
    });

    it('error: replace a non-existent survey', function () {
        const replacementSurvey = generator.newSurvey();
        return models.survey.replaceSurvey(999, replacementSurvey)
            .then(shared.throwingHandler, shared.expectedErrorHandler('surveyNotFound'));
    });

    it('get survey 3 in spanish when no name translation', function () {
        const survey = hxSurvey.server(3);
        return models.survey.getSurvey(survey.id, { language: 'es' })
            .then(result => {
                expect(result).to.deep.equal(survey);
            });
    });

    it('list surveys in spanish when no translation', function () {
        return models.survey.listSurveys({ language: 'es' })
            .then(result => {
                const list = hxSurvey.listServers();
                expect(result).to.deep.equal(list);
            });
    });

    const translateTextFn = function (index, language) {
        return function () {
            const survey = hxSurvey.server(index);
            const translation = translator.translateSurvey(survey, language);
            return models.survey.updateSurveyText(translation, language)
                .then(() => {
                    hxSurvey.translate(index, language, translation);
                });
        };
    };

    const getTranslatedFn = function (index, language) {
        return function () {
            const id = hxSurvey.id(index);
            return models.survey.getSurvey(id, { language })
                .then(result => {
                    translator.isSurveyTranslated(result, language);
                    const expected = hxSurvey.translatedServer(index, language);
                    expect(result).to.deep.equal(expected);
                });
        };
    };

    const listTranslatedFn = function (language) {
        return function () {
            return models.survey.listSurveys({ language })
                .then(result => {
                    const expected = hxSurvey.listTranslatedServers(language);
                    expect(result).to.deep.equal(expected);
                });
        };
    };

    for (let i = 0; i < surveyCount; i += 2) {
        it(`add translated name to survey ${i}`, translateTextFn(i, 'es'));
        it(`get and verify translated survey ${i}`, getTranslatedFn(i, 'es'));
    }

    it('list and verify translated surveys', listTranslatedFn('es'));

    it('list surveys in english (original)', function () {
        return models.survey.listSurveys({ language: 'en' })
            .then(result => {
                const list = hxSurvey.listServers();
                expect(result).to.deep.equal(list);
            });
    });

    const replaceSurveyFn = function (index) {
        return function () {
            const id = hxSurvey.id(index);
            const clientSurvey = generator.newSurvey();
            return models.survey.replaceSurvey(id, clientSurvey)
                .then(id => models.survey.getSurvey(id))
                .then((serverSurvey) => {
                    comparator.survey(clientSurvey, serverSurvey);
                    hxSurvey.replace(index, clientSurvey, serverSurvey);
                })
                .then(() => models.survey.listSurveys())
                .then(surveys => {
                    const expected = hxSurvey.listServers();
                    expect(surveys).to.deep.equal(expected);
                });
        };
    };

    const dbVersionCompareFn = function (index, count) {
        return function () {
            const id = hxSurvey.id(index);
            return models.survey.getSurvey(id, { override: { attributes: ['id', 'version', 'groupId'] } })
                .then(surveyWithGroupId => {
                    const groupId = surveyWithGroupId.groupId;
                    return models.survey.listSurveys({
                            scope: 'version-only',
                            history: true,
                            order: 'version',
                            groupId
                        })
                        .then(actual => actual.map(({ id, version, groupId }) => ({ version, groupId })))
                        .then(actual => {
                            const expected = _.range(1, count + 1).map(version => ({ version, groupId }));
                            expect(actual).to.deep.equal(expected);
                        });
                });
        };
    };

    [3, 0, surveyCount + 1].forEach(index => {
        it(`replace survey ${index} with survey ${surveyCount+index}`, replaceSurveyFn(index));
    });

    it(`survey ${surveyCount} is version 2`, dbVersionCompareFn(surveyCount, 2));
    it(`survey ${surveyCount+2} is version 3`, dbVersionCompareFn(surveyCount + 2, 3));

    const dbVersionParentlessCompareFn = function (index, replaced) {
        return function () {
            const id = hxSurvey.id(index);
            return models.survey.getSurvey(id, { override: { attributes: ['id', 'version', 'groupId'], paranoid: false } })
                .then(survey => {
                    if (replaced) {
                        const { version, groupId } = survey;
                        expect({ id, version, groupId }).to.deep.equal({ id, version: 1, groupId: id });
                    } else {
                        const { version, groupId } = survey;
                        expect({ id, version, groupId }).to.deep.equal({ id, version: null, groupId: null });
                    }
                });
        };
    };

    it('survey 1 is version null', dbVersionParentlessCompareFn(1, false));
    it('survey 3 is version 1', dbVersionParentlessCompareFn(3, true));

    it('update survey count', function () {
        surveyCount += 3;
    });

    it('listSurvey override where', function () {
        return models.survey.listSurveys({ scope: 'version', version: 3, history: true })
            .then(list => {
                expect(list).to.have.length(1);
                const { name, version } = list[0];
                expect(version).to.equal(3);
                const expected = hxSurvey.server(10).name;
                expect(name).to.equal(expected);
            });
    });

    it('delete survey 5', tests.deleteSurveyFn(5));

    it('list surveys', tests.listSurveysFn());

    it('extract existing questions', function () {
        hxSurvey.questions = _.flatten(_.map(hxSurvey.listServers('questions'), 'questions'));
    });

    it('create survey by existing questions only', function () {
        const survey = generator.newSurvey();
        const questions = hxSurvey.questions.slice(0, 10);
        survey.questions = questions.map(({ id, required }) => ({ id, required }));
        return models.survey.createSurvey(survey)
            .then(id => models.survey.getSurvey(id))
            .then(serverSurvey => {
                survey.questions = questions;
                comparator.survey(survey, serverSurvey);
                hxSurvey.push(survey, serverSurvey);
                ++surveyCount;
            });
    });

    it('create survey by existing/new questions', function () {
        const survey = generator.newSurvey();
        const fn = index => ({ id: hxSurvey.questions[index].id, required: hxSurvey.questions[index].required });
        const additionalIds = [10, 11].map(fn);
        survey.questions.splice(1, 0, ...additionalIds);
        return models.survey.createSurvey(survey)
            .then(id => models.survey.getSurvey(id))
            .then((serverSurvey) => {
                ++surveyCount;
                survey.questions[1] = hxSurvey.questions[10];
                survey.questions[2] = hxSurvey.questions[11];
                hxSurvey.push(survey, serverSurvey);
                comparator.survey(survey, serverSurvey);
            });
    });

    for (let i = 0; i < userCount; ++i) {
        it(`create user ${i}`, shared.createUserFn(hxUser));
    }

    const auxAnswerVerifySurvey = function (survey, input) {
        return models.answer.createAnswers(input)
            .then(function () {
                return models.survey.getAnsweredSurvey(input.userId, input.surveyId)
                    .then(answeredSurvey => {
                        comparator.answeredSurvey(survey, input.answers, answeredSurvey);
                    });
            });
    };

    const answerVerifySurveyFn = function (surveyIndex) {
        return function () {
            const survey = hxSurvey.server(surveyIndex);
            const answers = generator.answerQuestions(survey.questions);
            const input = {
                userId: hxUser.id(0),
                surveyId: survey.id,
                answers
            };
            return auxAnswerVerifySurvey(survey, input);
        };
    };

    [1, 2, 7, 10, 11, 12].forEach(index => {
        it(`answer survey ${index} and get/verify answered`, answerVerifySurveyFn(index));
    });

    it('error: answer without required questions', function () {
        const survey = hxSurvey.server(4);
        const qxs = survey.questions;
        const answers = generator.answerQuestions(qxs);
        const input = {
            userId: hxUser.id(0),
            surveyId: survey.id,
            answers
        };
        const requiredIndices = _.range(qxs.length).filter(index => qxs[index].required);
        expect(requiredIndices).to.have.length.above(0);
        const removedAnswers = _.pullAt(answers, requiredIndices);
        let px = models.answer.createAnswers(input)
            .then(shared.throwingHandler, shared.expectedErrorHandler('answerRequiredMissing'));
        _.range(1, removedAnswers.length).forEach(index => {
            px = px
                .then(() => answers.push(removedAnswers[index]))
                .then(() => models.answer.createAnswers(input))
                .then(shared.throwingHandler, shared.expectedErrorHandler('answerRequiredMissing'));
        });
        px = px.then(() => {
            answers.push(removedAnswers[0]);
            return auxAnswerVerifySurvey(survey, input);
        });
        return px;
    });

    it('reanswer without all required questions', function () {
        const survey = hxSurvey.server(4);
        const userId = hxUser.id(0);
        return models.survey.getAnsweredSurvey(userId, survey.id)
            .then(answeredSurvey => {
                const qxs = survey.questions;
                const answers = generator.answerQuestions(qxs);
                const input = {
                    userId: hxUser.id(0),
                    surveyId: survey.id,
                    answers
                };
                const requiredIndices = _.range(qxs.length).filter(index => qxs[index].required);
                expect(requiredIndices).to.have.length.above(1);
                _.pullAt(answers, requiredIndices[0]);
                return models.answer.createAnswers(input)
                    .then(() => {
                        const removedQxId = qxs[requiredIndices[0]].id;
                        const removedAnswer = answeredSurvey.questions.find(qx => (qx.id === removedQxId)).answer;
                        answers.push({ questionId: removedQxId, answer: removedAnswer });
                        return models.survey.getAnsweredSurvey(input.userId, input.surveyId)
                            .then(answeredSurvey => {
                                comparator.answeredSurvey(survey, answers, answeredSurvey);
                            });
                    });
            });
    });

    it('error: answer with invalid question id', function () {
        const survey = hxSurvey.server(6);
        const qxs = survey.questions;
        const answers = generator.answerQuestions(qxs);
        const input = {
            userId: hxUser.id(0),
            surveyId: survey.id,
            answers
        };
        answers[0].questionId = 999;
        return models.answer.createAnswers(input)
            .then(shared.throwingHandler, shared.expectedErrorHandler('answerQxNotInSurvey'));
    });
});
