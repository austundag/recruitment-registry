'use strict';

const _ = require('lodash');

const shared = require('./shared.js');

exports.createResearchSite = function createResearchSite(req, res) {
    req.models.researchSite.createResearchSite(req.body)
        .then(result => res.status(201).json(result))
        .catch(shared.handleError(req, res));
};

exports.getResearchSite = function getResearchSite(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    req.models.researchSite.getResearchSite(id)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(req, res));
};

exports.patchResearchSite = function patchResearchSite(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    req.models.researchSite.patchResearchSite(id, req.body)
        .then(() => res.status(204).end())
        .catch(shared.handleError(req, res));
};

exports.deleteResearchSite = function deleteResearchSite(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    req.models.researchSite.deleteResearchSite(id)
        .then(() => res.status(204).end())
        .catch(shared.handleError(req, res));
};

exports.listResearchSites = function listResearchSites(req, res) {
    const nearZip = _.get(req, 'swagger.params.near-zip.value');
    const options = nearZip ? { nearZip } : {};
    req.models.researchSite.listResearchSites(options)
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(req, res));
};

exports.createResearchSiteVicinity = function createResearchSiteVicinity(req, res) {
    const id = _.get(req, 'swagger.params.id.value');
    const zipCodes = req.body.zipCodes;
    req.models.researchSite.createResearchSiteVicinity(id, zipCodes)
        .then(() => res.status(204).end())
        .catch(shared.handleError(req, res));
};
