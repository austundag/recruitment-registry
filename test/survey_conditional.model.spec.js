/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const _ = require('lodash');

const models = require('../models');
const Answerer = require('./util/generator/answerer');
const QuestionGenerator = require('./util/generator/question-generator');
const ConditionalSurveyGenerator = require('./util/generator/conditional-survey-generator');
const Generator = require('./util/generator');
const comparator = require('./util/comparator');
const SurveyHistory = require('./util/survey-history');
const History = require('./util/History');
const SharedSpec = require('./util/shared-spec');
const choiceSetCommon = require('./util/choice-set-common');
const surveyCommon = require('./util/survey-common');

describe('survey (conditional questions) unit', function () {
    const answerer = new Answerer();
    const questionGenerator = new QuestionGenerator();
    const surveyGenerator = new ConditionalSurveyGenerator({ questionGenerator, answerer });
    const generator = new Generator({ surveyGenerator, questionGenerator, answerer });
    const shared = new SharedSpec(generator);

    let surveyCount = surveyGenerator.numOfCases();

    const hxUser = new History();
    const hxSurvey = new SurveyHistory();
    const hxChoiceSet = new History();
    const tests = new surveyCommon.SpecTests(generator, hxSurvey);
    const choiceSetTests = new choiceSetCommon.SpecTests(generator, hxChoiceSet);

    before(shared.setUpFn());

    const choiceSets = ConditionalSurveyGenerator.getChoiceSets();
    choiceSets.forEach((choiceSet, index) => {
        it(`create choice set ${index}`, choiceSetTests.createChoiceSetFn(choiceSet));
        it(`get choice set ${index}`, choiceSetTests.getChoiceSetFn(index));
    });
    it('set comparator choice map', function () {
        comparator.updateChoiceSetMap(choiceSets);
    });

    _.range(surveyCount).forEach(index => {
        it(`create survey ${index}`, tests.createSurveyFn({ noSection: true }));
        it(`get survey ${index}`, tests.getSurveyFn(index));
    });

    _.range(surveyCount).forEach(surveyIndex => {
        it(`create survey ${surveyIndex + surveyCount} from survey ${surveyIndex} questions`, function () {
            const survey = hxSurvey.server(surveyIndex);
            const clientSurvey = hxSurvey.client(surveyIndex);
            const newSurvey = ConditionalSurveyGenerator.newSurveyFromPrevious(clientSurvey, survey);
            return models.survey.createSurvey(newSurvey)
                .then(id => {
                    const survey = _.cloneDeep(hxSurvey.server(surveyIndex));
                    survey.id = id;
                    hxSurvey.push(newSurvey, survey);
                });
        });
    });

    const verifySurveyFn = function (index) {
        return function () {
            const survey = _.cloneDeep(hxSurvey.server(index));
            return models.survey.getSurvey(survey.id)
                .then(serverSurvey => {
                    comparator.conditionalSurveyTwiceCreated(survey, serverSurvey);
                });
        };
    };

    _.range(surveyCount, 2 * surveyCount).forEach(surveyIndex => {
        it(`verify survey ${surveyIndex}`, verifySurveyFn(surveyIndex));
    });

    _.range(3).forEach(index => {
        it(`create user ${index}`, shared.createUserFn(hxUser));
    });

    ConditionalSurveyGenerator.conditionalErrorSetup().forEach(errorSetup => {
        it(`error: survey ${errorSetup.surveyIndex} validation ${errorSetup.caseIndex}`, function () {
            const { surveyIndex, error } = errorSetup;
            const survey = hxSurvey.server(surveyIndex);
            const answers = surveyGenerator.answersWithConditions(survey, errorSetup);
            const input = {
                userId: hxUser.id(0),
                surveyId: survey.id,
                answers
            };

            return models.answer.createAnswers(input)
                .then(shared.throwingHandler, shared.expectedErrorHandler(error));
        });
    });

    ConditionalSurveyGenerator.conditionalPassSetup().forEach(passSetup => {
        let answers;

        it(`create survey ${passSetup.surveyIndex} answers ${passSetup.caseIndex}`, function () {
            const { surveyIndex } = passSetup;
            const survey = hxSurvey.server(surveyIndex);
            answers = surveyGenerator.answersWithConditions(survey, passSetup);
            const input = {
                userId: hxUser.id(0),
                surveyId: survey.id,
                answers
            };

            return models.answer.createAnswers(input);
        });

        it(`verify survey ${passSetup.surveyIndex} answers ${passSetup.caseIndex}`, function () {
            const { surveyIndex } = passSetup;
            const survey = hxSurvey.server(surveyIndex);
            const userId = hxUser.id(0);
            return models.survey.getAnsweredSurvey(userId, survey.id)
                .then(answeredSurvey => {
                    comparator.answeredSurvey(survey, answers, answeredSurvey);
                });
        });
    });
});
