'use strict';

const models = require('../models');
const shared = require('./shared.js');

const registry = models.registry;

exports.createProfile = function (req, res) {
    registry.createProfile(req.body)
        .then(tokenObj => res.status(201).json(tokenObj))
        .catch(shared.handleError(res));
};

exports.updateProfile = function (req, res) {
    registry.updateProfile(req.user.id, req.body)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.getProfile = function (req, res) {
    registry.getProfile({ userId: req.user.id })
        .then(result => res.status(200).json(result))
        .catch(shared.handleError(res));
};