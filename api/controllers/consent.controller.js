'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');

const Consent = models.Consent;

exports.createConsent = function (req, res) {
    const consent = req.body;
    Consent.createConsent(consent)
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(res));
};

exports.deleteConsent = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    Consent.deleteConsent(id)
        .then(() => res.status(204).json({}))
        .catch(shared.handleError(res));
};

exports.getConsent = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    Consent.getConsent(id)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};

exports.getConsentByName = function (req, res) {
    const name = _.get(req, 'swagger.params.name.value');
    Consent.getConsentByName(name)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};

exports.listConsents = function (req, res) {
    Consent.listConsents()
        .then((consents) => res.status(200).json(consents))
        .catch(shared.handleError(res));
};

exports.getConsentDocuments = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    Consent.getConsentDocuments(id)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};

exports.getConsentDocumentsByName = function (req, res) {
    const name = _.get(req, 'swagger.params.name.value');
    Consent.getConsentDocumentsByName(name)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};

exports.getUserConsentDocuments = function (req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    Consent.getUserConsentDocuments(req.user.id, id)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};

exports.getUserConsentDocumentsByName = function (req, res) {
    const name = _.get(req, 'swagger.params.name.value');
    Consent.getUserConsentDocumentsByName(req.user.id, name)
        .then((consent) => res.status(200).json(consent))
        .catch(shared.handleError(res));
};