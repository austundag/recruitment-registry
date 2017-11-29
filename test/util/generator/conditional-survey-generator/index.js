'use strict';

/* eslint no-param-reassign: 0, max-len: 0 */

const _ = require('lodash');
const models = require('../../../../models');

const SurveyGenerator = require('../survey-generator');
const Answerer = require('../answerer');

const conditionalSetup = require('./conditional-setup');
const requiredOverrides = require('./required-overrides');
const errorAnswerSetup = require('./error-answer-setup');
const passAnswerSetup = require('./pass-answer-setup');
const choiceSets = require('./choice-sets');

const specialQuestionGenerator = {
    multipleSupport(surveyGenerator, questionInfo) {
        const options = { type: 'text', max: questionInfo.selectionCount };
        return surveyGenerator.questionGenerator.newMultiQuestion(options);
    },
    type(surveyGenerator, questionInfo) {
        const type = questionInfo.type;
        return surveyGenerator.questionGenerator.newQuestion({ type });
    },
    enableWhen(surveyGenerator, questionInfo, index) {
        const { type, relativeIndex, logic } = questionInfo;
        const question = surveyGenerator.questionGenerator.newQuestion({ type });
        const questionIndex = index - relativeIndex;
        const enableWhen = [{ questionIndex, logic }];
        question.enableWhen = enableWhen;
        return question;
    },
    questionSection(surveyGenerator, questionInfo) {
        const type = questionInfo.type;
        return surveyGenerator.questionGenerator.newQuestion({ type });
    },
};

const specialAnswerer = {
    samerule(generator, questions, question, answerInfo) {
        const ruleQuestion = questions[answerInfo.ruleQuestionIndex];
        const enableWhen = ruleQuestion.enableWhen;
        const enableWhenAnswer = enableWhen[0].answer;
        if (!enableWhenAnswer) {
            throw new Error('There should be an answer specified');
        }
        return { questionId: question.id, answer: enableWhenAnswer };
    },
    differentrule(generator, questions, question, answerInfo) {
        const ruleQuestion = questions[answerInfo.ruleQuestionIndex];
        const enableWhen = ruleQuestion.enableWhen;
        const enableWhenAnswer = enableWhen[0].answer;
        if (!enableWhenAnswer) {
            throw new Error('There should be an answer specified');
        }
        let answer = generator.answerer.answerQuestion(question);
        if (_.isEqual(answer.answer, enableWhenAnswer)) {
            answer = generator.answerer.answerQuestion(question);
        }
        return answer;
    },
    samerulesection(generator, questions, question) {
        const enableWhen = question.sections[0].enableWhen;
        const enableWhenAnswer = enableWhen[0].answer;
        if (!enableWhenAnswer) {
            throw new Error('There should be an answer specified');
        }
        return { questionId: question.id, answer: enableWhenAnswer };
    },
    differentrulesection(generator, questions, question) {
        const enableWhen = question.sections[0].enableWhen;
        const enableWhenAnswer = enableWhen[0].answer;
        if (!enableWhenAnswer) {
            throw new Error('There should be an answer specified');
        }
        let answer = generator.answerer.answerQuestion(question);
        if (_.isEqual(answer.answer, enableWhenAnswer)) {
            answer = generator.answerer.answerQuestion(question);
        }
        return answer;
    },
    selectchoice(generator, questions, question, answerInfo) {
        return generator.answerer.answerChoiceQuestion(question, answerInfo.selectionChoice);
    },
};

const surveyManipulator = {
    surveyEnableWhen(survey, conditionalInfo, generator) {
        const { hxSurvey, answerer } = generator;
        const { answerSurveyIndex, answerQuestionIndex, logic } = conditionalInfo;
        const { id: surveyId, questions } = hxSurvey.server(answerSurveyIndex);
        const question = questions[answerQuestionIndex];
        const rule = answerer.answerQuestion(question);
        Object.assign(rule, { surveyId, logic });
        const enableWhen = [rule];
        survey.enableWhen = enableWhen;
        return question;
    },
};

const questionSurveyManipulator = {
    enableWhen(survey, questionInfo, generator) {
        const questionIndex = questionInfo.questionIndex;
        const question = survey.questions[questionIndex];
        const sourceIndex = question.enableWhen[0].questionIndex;
        generator.addAnswer(question.enableWhen[0], question.enableWhen[0], survey.questions[sourceIndex]);
    },
    questionSection(survey, questionInfo, generator) {
        const { questionIndex, logic, count } = questionInfo;
        const question = survey.questions[questionIndex];
        const deletedQuestions = survey.questions.splice(questionIndex + 1, count);
        const rule = { questionIndex, logic };
        generator.addAnswer(rule, questionInfo, question);
        question.sections = [{
            questions: deletedQuestions,
            enableWhen: [rule],
        }];
    },
};

module.exports = class ConditionalSurveyGenerator extends SurveyGenerator {
    constructor({ questionGenerator, answerer, hxSurvey } = {}) {
        super(questionGenerator);
        this.answerer = answerer || new Answerer();
        this.hxSurvey = hxSurvey;
        this.conditionalMap = conditionalSetup.reduce((r, questionInfo) => {
            const { surveyIndex, purpose, questionIndex } = questionInfo;
            if (surveyIndex === undefined) {
                throw new Error('No survey index specified');
            }
            if ((purpose === 'completeSurvey') || (purpose === 'surveyEnableWhen')) {
                r[surveyIndex] = questionInfo;
                r.surveyLevel = true;
                return r;
            }
            let survey = r[surveyIndex];
            if (!survey) {
                survey = {};
                r[surveyIndex] = survey;
            }
            if (questionIndex === undefined) {
                throw new Error('No survey question index specified.');
            }
            survey[questionIndex] = questionInfo;
            return r;
        }, {});
        this.counts = [0, 8, 8, 8, 8, 8, 8, 8, 8];
    }

    count() {
        const surveyIndex = this.currentIndex();
        return this.counts[surveyIndex];
    }

    versionWithIdsNeeded(surveyIndex) {
        const { surveyLevel, purpose } = this.conditionalMap[surveyIndex];
        return !(surveyLevel && purpose === 'surveyEnableWhen');
    }

    numOfCases() {
        return this.counts.length;
    }

    addAnswer(rule, questionInfo, question) {
        const logic = questionInfo.logic;
        if (logic === 'equals' || logic === 'not-equals') {
            rule.answer = this.answerer.answerRawQuestion(question);
        }
    }

    getRequiredOverride(key) { // eslint-disable-line class-methods-use-this
        return requiredOverrides[key];
    }

    newSurveyQuestion(index) {
        const surveyIndex = this.currentIndex();
        const questionInfo = this.conditionalMap[surveyIndex][index];
        let question;
        if (questionInfo) {
            const purpose = questionInfo.purpose;
            question = specialQuestionGenerator[purpose](this, questionInfo, index);
            question.required = false;
        } else {
            question = super.newSurveyQuestion(index);
        }
        const requiredOverride = this.getRequiredOverride(`${surveyIndex}-${index}`);
        if (requiredOverride !== undefined) {
            question.required = requiredOverride;
        }
        return question;
    }

    static conditionalErrorSetup() {
        return errorAnswerSetup;
    }

    static conditionalPassSetup() {
        return passAnswerSetup;
    }

    static getChoiceSets() {
        return choiceSets;
    }

    answersWithConditions(survey, { questionIndex, multipleIndices, noAnswers = [], specialAnswers = [] }) {
        const questions = models.survey.getQuestions(survey);
        const doNotAnswer = new Set(noAnswers);
        const doAnswer = new Map(specialAnswers.map(r => [r.questionIndex, r]));
        const answers = questions.reduce((r, question, index) => {
            if (doNotAnswer.has(index)) {
                return r;
            }
            const specialAnswer = doAnswer.get(index);
            if (specialAnswer) {
                const type = specialAnswer.type;
                const answer = specialAnswerer[type](this, questions, question, specialAnswer);
                r.push(answer);
                return r;
            }
            if ((questionIndex + 1 === index) && multipleIndices) {
                if (multipleIndices.length) {
                    const answer = this.answerer.answerMultipleQuestion(question, multipleIndices);
                    r.push(answer);
                }
                return r;
            }
            const answer = this.answerer.answerQuestion(question);
            r.push(answer);
            return r;
        }, []);
        return answers;
    }

    newSurvey() {
        const surveyIndex = this.currentIndex();
        const conditionalInfo = this.conditionalMap[surveyIndex + 1];
        const { surveyLevel, purpose: surveyLevelPurpose } = conditionalInfo;
        if (surveyLevel && surveyLevelPurpose === 'completeSurvey') {
            this.incrementIndex();
            return conditionalInfo.survey;
        }
        const survey = super.newSurvey({ noSection: true });
        if (surveyLevel) {
            const manipulator = surveyManipulator[surveyLevelPurpose];
            manipulator(survey, conditionalInfo, this);
        }
        _.forOwn(conditionalInfo, (questionInfo) => {
            const purpose = questionInfo.purpose;
            const manipulator = questionSurveyManipulator[purpose];
            if (manipulator) {
                manipulator(survey, questionInfo, this);
            }
        });
        return survey;
    }

    static newSurveyQuestionsFromPrevious(serverQuestions) {
        const questions = serverQuestions.map(({ id, required, enableWhen, sections }) => {
            const question = { id, required };
            if (enableWhen) {
                const newEnableWhen = _.cloneDeep(enableWhen);
                newEnableWhen.forEach(rule => delete rule.id);
                question.enableWhen = newEnableWhen;
            }
            if (sections) {
                question.sections = ConditionalSurveyGenerator.newSurveySectionsFromPrevious(sections);
            }
            return question;
        });
        return questions;
    }

    static newSurveySectionsFromPrevious(serverSections) {
        return serverSections.map(({ name, enableWhen, sections, questions }) => {
            const newSection = { name };
            if (enableWhen) {
                const newEnableWhen = _.cloneDeep(enableWhen);
                newEnableWhen.forEach(rule => delete rule.id);
                newSection.enableWhen = newEnableWhen;
            }
            if (sections) {
                newSection.sections = ConditionalSurveyGenerator.newSurveySectionsFromPrevious(sections);
            }
            if (questions) {
                newSection.questions = ConditionalSurveyGenerator.newSurveyQuestionsFromPrevious(questions);
            }
            return newSection;
        });
    }

    static newSurveyFromPrevious(clientSurvey, serverSurvey) {
        const newSurvey = _.cloneDeep(clientSurvey);
        if (clientSurvey.questions) {
            newSurvey.questions = ConditionalSurveyGenerator.newSurveyQuestionsFromPrevious(serverSurvey.questions);
        } else if (clientSurvey.sections) {
            newSurvey.sections = ConditionalSurveyGenerator.newSurveySectionsFromPrevious(serverSurvey.sections);
        }
        return newSurvey;
    }
};
