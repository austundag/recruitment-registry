'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');
const jsonSchema = require('../lib/json-schema');

exports.getSurvey = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    const language = _.get(req, 'swagger.params.language.value');
    const options = language ? { language } : {};
    models.survey.getSurvey(id, options)
        .then(survey => res.status(200).json(survey))
        .catch(shared.handleError(res));
};

exports.getSurveyByName = function (req, res) {
    const name = _.get(req, 'swagger.params.name.value');
    const language = _.get(req, 'swagger.params.language.value');
    const options = language ? { language } : {};
    models.survey.getSurveyByName(name, options)
        .then(survey => res.status(200).json(survey))
        .catch(shared.handleError(res));
};

exports.createSurvey = function (req, res) {
    const survey = req.body;
    if (!jsonSchema('newSurvey', survey, res)) {
        return;
    }
    const parent = _.get(req, 'swagger.params.parent.value');
    if (parent) {
        models.survey.replaceSurvey(parent, survey)
            .then(id => res.status(201).json({ id }))
            .catch(shared.handleError(res));
    } else {
        models.survey.createSurvey(survey)
            .then(id => res.status(201).json({ id }))
            .catch(shared.handleError(res));
    }
};

exports.updateSurveyText = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    models.survey.updateSurveyText(req.body, language)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.updateSurvey = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    models.survey.updateSurvey(id, req.body)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.deleteSurvey = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    models.survey.deleteSurvey(id)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.listSurveys = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    const options = language ? { language } : {};
    models.survey.listSurveys(options)
        .then(surveys => res.status(200).json(surveys))
        .catch(shared.handleError(res));
};

exports.getAnsweredSurveyByName = function (req, res) {
    const userId = req.user.id;
    const name = _.get(req, 'swagger.params.name.value');
    const language = _.get(req, 'swagger.params.language.value');
    const options = language ? { language } : {};
    models.survey.getAnsweredSurveyByName(userId, name, options)
        .then(survey => res.status(200).json(survey))
        .catch(shared.handleError(res));
};

exports.replaceSurveySections = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    models.survey.replaceSurveySections(id, req.body)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};
