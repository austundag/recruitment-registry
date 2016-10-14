'use strict';

const _ = require('lodash');

module.exports = function (sequelize, tableName, parentIdField) {
    return {
        createTextTx(input, tx) {
            const Table = sequelize.models[tableName];
            const language = input.language || 'en';
            const where = { language };
            where[parentIdField] = input[parentIdField];
            return Table.destroy({ where }, { transaction: tx })
                .then(() => {
                    const record = _.cloneDeep(input);
                    record.language = language;
                    return Table.create(record, { transaction: tx })
                        .then(() => {});
                });
        },
        createText(input) {
            const Table = sequelize.models[tableName];
            return sequelize.transaction(function (tx) {
                return Table.createTextTx(input, tx);
            });
        },
        getText(parentId, language = 'en') {
            const Table = sequelize.models[tableName];
            const where = { language };
            where[parentIdField] = parentId;
            let query = { where, raw: true, attributes: ['text'] };
            return Table.findOne(query)
                .then(result => {
                    if ((language === 'en') || (!result)) {
                        return result.text;
                    }
                    query.where.language = 'en';
                    return Table.findOne(query)
                        .then(result => result.text);
                });
        },
        getAllTexts(ids, language = 'en') {
            const Table = sequelize.models[tableName];
            const options = { raw: true, attributes: [parentIdField, 'text'] };
            if (language === 'en') {
                options.language = 'en';
            } else {
                _.set(`language.$in`, ['en', language]);

            }
            if (ids) {
                _.set(`where.${parentIdField}.$in`, ids);
            }
            return Table.findAll(options)
                .then(records => {
                    if (language === 'en') {
                        return _.keyBy(records, parentIdField);
                    }
                    const enRecords = _.remove(records, r => r.language === 'en');
                    const map = _.keyBy(records, parentIdField);
                    enRecords.forEach(record => {
                        const parentId = record[parentIdField];
                        if (!map[parentId]) {
                            map[parentId] = record;
                            records.push(record);
                        }
                    });
                    return map;
                });
        }
    };
};
