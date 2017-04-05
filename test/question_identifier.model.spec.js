/* global describe,before,it*/

'use strict';

process.env.NODE_ENV = 'test';

const _ = require('lodash');

const models = require('../models');
const SharedSpec = require('./util/shared-spec.js');
const Generator = require('./util/generator');
const QuestionIdentifierGenerator = require('./util/generator/question-identifier-generator');
const History = require('./util/history');
const questionCommon = require('./util/question-common');

const generator = new Generator();
const shared = new SharedSpec(generator);

describe('question identifier unit', function questionIdentifierUnit() {
    const hxQuestion = new History();
    const idGenerator = new QuestionIdentifierGenerator();
    const hxIdentifiers = {};
    const tests = new questionCommon.SpecTests({ generator, hxQuestion, idGenerator, hxIdentifiers });
    let questionCount = 0;

    before(shared.setUpFn());

    _.range(20).forEach((index) => {
        it(`create question ${index}`, tests.createQuestionFn());
        it(`get question ${index}`, tests.getQuestionFn(index));
        it(`add cc type id to question ${index}`, tests.addIdentifierFn(index, 'cc'));
    });

    questionCount += 20;

    it('reset identifier generator', () => {
        idGenerator.reset();
    });

    it('error: cannot specify same type/value identifier', function errorSame() {
        const question = hxQuestion.server(0);
        const identifiers = idGenerator.newIdentifiers(question, 'cc');
        const { type, identifier } = identifiers;
        const errorType = 'SequelizeUniqueConstraintError';
        return models.question.addQuestionIdentifiers(question.id, identifiers)
            .then(shared.throwingHandler)
            .catch(shared.expectedSeqErrorHandler(errorType, { type, identifier }));
    });

    it('reset identifier generator', () => {
        idGenerator.reset();
    });

    _.range(questionCount).forEach((index) => {
        it(`add au type id to question ${index}`, tests.addIdentifierFn(index, 'au'));
    });

    _.range(questionCount).forEach((index) => {
        it(`add ot type id to question ${index}`, tests.addIdentifierFn(index, 'ot'));
    });

    _.range(questionCount).forEach((index) => {
        it(`verify cc type id to question ${index}`, tests.verifyQuestionIdentifiersFn(index, 'cc'));
        it(`verify ot type id to question ${index}`, tests.verifyQuestionIdentifiersFn(index, 'ot'));
        it(`verify au type id to question ${index}`, tests.verifyQuestionIdentifiersFn(index, 'au'));
    });

    _.range(questionCount).forEach((index) => {
        it(`verify cc type answer id to question ${index}`, tests.verifyAnswerIdentifiersFn(index, 'cc'));
        it(`verify ot type answer id to question ${index}`, tests.verifyAnswerIdentifiersFn(index, 'ot'));
        it(`verify au type answer id to question ${index}`, tests.verifyAnswerIdentifiersFn(index, 'au'));
    });
});
