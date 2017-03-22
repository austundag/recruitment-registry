'use strict';

module.exports = function registry(sequelize, Sequelize, schema) {
    const tableName = 'registry';
    const modelName = tableName;
    return sequelize.define(modelName, {
        name: {
            type: Sequelize.TEXT,
            allowNull: false,
        },
        url: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        schema: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        createdAt: {
            type: Sequelize.DATE,
            field: 'created_at',
        },
        deletedAt: {
            type: Sequelize.DATE,
            field: 'deleted_at',
        },
    }, {
        freezeTableName: true,
        tableName,
        schema,
        createdAt: 'createdAt',
        updatedAt: false,
        deletedAt: 'deletedAt',
        indexes: ['name', 'url', 'schema'].map(field => ({
            unique: true,
            fields: [field],
            where: { deleted_at: { $eq: null } },
        })),
        paranoid: true,
    });
};
