'use strict';

const Base = require('./base');
const RRError = require('../../lib/rr-error');

module.exports = class SurveyConsentDAO extends Base {
    constructor(db, dependencies) {
        super(db);
        Object.assign(this, dependencies);
    }

    createSurveyConsent({ surveyId, consentId, consentTypeId, action }) {
        const SurveyConsent = this.db.SurveyConsent;
        const ConsentSection = this.db.ConsentSection;
        if (!consentId) {
            return SurveyConsent.create({ surveyId, consentTypeId, action })
                .then(({ id }) => ({ id }));
        }
        return ConsentSection.count({ where: { consentId, typeId: consentTypeId } })
            .then((count) => {
                if (count) {
                    return SurveyConsent.create({ surveyId, consentId, consentTypeId, action })
                        .then(({ id }) => ({ id }));
                }
                return RRError.reject('surveyConsentInvalidTypeForConsent');
            });
    }

    updateConsentsInSurveyConsents(surveyConsents) {
        if (surveyConsents.length < 1) {
            return surveyConsents;
        }
        const consentIds = surveyConsents.reduce((r, { consentId }) => {
            if (consentId) {
                r.push(consentId);
            }
            return r;
        }, []);
        const Consent = this.db.Consent;
        return Consent.findAll({ raw: true, where: { id: { $in: consentIds } }, attributes: ['id', 'name'] })
            .then(consents => new Map(consents.map(consent => [consent.id, consent.name])))
            .then((consentMap) => {
                surveyConsents.forEach((r) => {
                    const consentId = r.consentId;
                    if (consentId) {
                        const consentName = consentMap.get(consentId);
                        r.consentName = consentName;
                    }
                });
                return surveyConsents;
            });
    }

    listSurveyConsents(options) {
        const attributes = ['id', 'consentId', 'consentTypeId', 'action'];
        return this.db.SurveyConsent.findAll({ raw: true, attributes })
            .then((surveyConsents) => {
                if (surveyConsents.length < 1) {
                    return surveyConsents;
                }
                surveyConsents.forEach(r => (r.consentId ? null : delete r.consentId));
                const consentTypeIds = surveyConsents.map(({ consentTypeId }) => consentTypeId);
                const typeIdSet = new Set(consentTypeIds);
                const ids = [...typeIdSet];
                const typeOptions = Object.assign({ ids }, options);
                return this.consentType.listConsentTypes(typeOptions)
                    .then(consentTypes => new Map(consentTypes.map(r => [r.id, r])))
                    .then((consentTypeMap) => {
                        surveyConsents.forEach((r) => {
                            const consentType = consentTypeMap.get(r.consentTypeId);
                            r.consentTypeName = consentType.name;
                            r.consentTypeTitle = consentType.title;
                        });
                    })
                    .then(() => this.updateConsentsInSurveyConsents(surveyConsents));
            });
    }

    deleteSurveyConsent(id) {
        const SurveyConsent = this.db.SurveyConsent;
        return SurveyConsent.destroy({ where: { id } });
    }
};
