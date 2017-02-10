'use strict';

const db = require('../db');
const sequelize = db.sequelize;

const SPromise = require('../../lib/promise');

const Translatable = require('./translatable');

const QuestionChoice = db.QuestionChoice;

module.exports = class QuestionChoiceDAO extends Translatable {
    constructor() {
        super('question_choice_text', 'questionChoiceId');
    }

    deleteNullData(choices) {
        choices.forEach(choice => {
            if (!choice.meta) {
                delete choice.meta;
            }
            if (!choice.code) {
                delete choice.code;
            }
        });
        return choices;
    }

    createQuestionChoiceTx(choice, transaction) {
        return QuestionChoice.create(choice, { transaction })
            .then(({ id }) => {
                const input = { id, text: choice.text };
                if (choice.code) {
                    input.code = choice.code;
                }
                return this.createTextTx(input, transaction)
                    .then(() => ({ id }));
            });
    }

    findChoicesPerQuestion(questionId, language) {
        return QuestionChoice.findAll({
                raw: true,
                where: { questionId },
                attributes: ['id', 'type', 'meta', 'code'],
                order: 'line'
            })
            .then(choices => this.deleteNullData(choices))
            .then(choices => this.updateAllTexts(choices, language));
    }

    getAllQuestionChoices(questionIds, language) {
        const options = {
            raw: true,
            attributes: ['id', 'type', 'questionId', 'meta', 'code'],
            order: 'line'
        };
        if (questionIds) {
            options.where = { questionId: { $in: questionIds } };
        }
        return QuestionChoice.findAll(options)
            .then(choices => this.deleteNullData(choices))
            .then(choices => this.updateAllTexts(choices, language));
    }

    updateMultipleChoiceTextsTx(choices, language, transaction) {
        const inputs = choices.map(({ id, text }) => ({ id, text, language }));
        return this.createMultipleTextsTx(inputs, transaction);
    }

    createQuestionChoices(enumerationId, choices, transaction) {
        const type = 'choice';
        const promises = choices.map(({ code, text }, line) => {
            return this.createQuestionChoiceTx({ enumerationId, text, code, line, type }, transaction);
        });
        return SPromise.all(promises);
    }

    updateMultipleChoiceTexts(choices, language) {
        return sequelize.transaction(transaction => {
            return this.updateMultipleChoiceTextsTx(choices, language, transaction);
        });
    }

    listQuestionChoices(enumerationId, language) {
        return QuestionChoice.findAll({ where: { enumerationId }, raw: true, attributes: ['id', 'code'], order: 'line' })
            .then(choices => this.updateAllTexts(choices, language));
    }

    deleteAllQuestionChoices(enumerationId, transaction) {
        return QuestionChoice.destroy({ where: { enumerationId }, transaction });
    }

    deleteQuestionChoice(id) {
        return QuestionChoice.destroy({ where: { id } });
    }
};
