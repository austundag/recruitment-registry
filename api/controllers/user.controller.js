'use strict';

const _ = require('lodash');

const models = require('../models');
const shared = require('./shared.js');

const User = models.User;

exports.createNewUser = function (req, res) {
    const username = req.body.username;
    User.findOne({ where: { username } })
        .then(data => {
            if (data) {
                return res.status(400).json({
                    message: 'An existing user has already used that username address.'
                });
            } else {
                const newUser = req.body;
                newUser.role = 'participant';
                return User.create(req.body)
                    .then(user => {
                        return res.status(201).json({
                            id: user.id,
                            username: user.username,
                            role: user.role
                        });
                    });
            }
        })
        .catch(shared.handleError(res));
};

exports.showCurrentUser = function (req, res) {
    const currentUser = _.omitBy(req.user, _.isNil);
    res.status(200).json(currentUser);
};

exports.updateCurrentUser = function (req, res) {
    User.updateUser(req.user.id, req.body)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.resetPassword = function (req, res) {
    User.resetPassword(req.body.token, req.body.password)
        .then(() => res.status(204).end())
        .catch(shared.handleError(res));
};

exports.listConsentDocuments = function (req, res) {
    const language = _.get(req, 'swagger.params.language.value');
    User.listConsentDocuments(req.user.id, { language })
        .then(consentDocuments => res.status(200).json(consentDocuments))
        .catch(shared.handleError(res));
};
