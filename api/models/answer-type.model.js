'use strict';

module.exports = function (sequelize, DataTypes) {
    const AnswerType = sequelize.define('answer_type', {
        name: {
            type: DataTypes.TEXT,
            allowNull: false,
            primaryKey: true
        },
        createdAt: {
            type: DataTypes.DATE,
            field: 'created_at',
        }
    }, {
        freezeTableName: true,
        createdAt: 'createdAt',
        hooks: {
            afterSync: function (options) {
                if (options.force) {
                    const names = ['choice', 'text', 'bool'];
                    const ps = names.map(name => AnswerType.create({ name }));
                    return sequelize.Promise.all(ps);
                }
            }
        }
    });

    return AnswerType;
};