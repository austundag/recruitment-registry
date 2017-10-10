'use strict';

const assessmentStageColumn = function (queryInterface, Sequelize) {
    return queryInterface.addColumn('assessment', 'stage', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
    });
};

const answerAssessmentIdColumn = function (queryInterface, Sequelize) {
    return queryInterface.addColumn('answer', 'assessment_id', {
        type: Sequelize.INTEGER,
        references: {
            model: {
                tableName: 'assessment',
            },
            key: 'id',
        },
    });
};

module.exports = {
    up(queryInterface, Sequelize) {
        return queryInterface.sequelize.query('ALTER TABLE assessment DROP CONSTRAINT assessment_name_key')
          .then(() => queryInterface.removeColumn('assessment', 'sequence_type'))
          .then(() => queryInterface.removeColumn('assessment', 'updated_at'))
          .then(() => queryInterface.removeColumn('assessment_survey', 'lookback'))
          .then(() => assessmentStageColumn(queryInterface, Sequelize))
          .then(() => answerAssessmentIdColumn(queryInterface, Sequelize))
          .then(() => queryInterface.renameColumn('user_assessment', 'sequence', 'version'))
          .then(() => queryInterface.addIndex('assessment', ['name', 'stage'], {
              indexName: 'assessment_name_stage',
              where: { deleted_at: { $eq: null } },
          }))
          .then(() => queryInterface.addIndex('assessment_survey', ['assessment_id'], {
              indexName: 'assessment_survey_assessment_id',
              where: { deleted_at: { $eq: null } },
          }))
          .then(() => queryInterface.addIndex('answer', ['assessment_id'], {
              indexName: 'answer_assessment_id',
              where: { deleted_at: { $eq: null } },
          }))
          .then(() => queryInterface.addIndex('answer', ['user_id'], {
              indexName: 'answer_user_id',
              where: { deleted_at: { $eq: null } },
          }));
    },

    //down: function (queryInterface, Sequelize) {
    //},
};
