'use strict';

module.exports = {
    name: 'FamilyTree',
    identifier: {
        type: 'bhr-gap',
        value: 'family-tree'
    },
    sections: [{
        name: 'Please indicate which family member(s) have or had memory problems (including Alzheimer\'s and any other form of dementia) by clicking on the person/people below.',
        questions: [{
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_4' },
            required: false,
            text: 'Me',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_5' },
            required: false,
            text: 'Mother',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_6' },
            required: false,
            text: 'Father',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_7' },
            required: false,
            text: 'M-Grandmother',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_8' },
            required: false,
            text: 'F-Grandmother',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_9' },
            required: false,
            text: 'M-Grandfather',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_10' },
            required: false,
            text: 'F-Grandfather',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_11' },
            required: false,
            text: 'Brother1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_12' },
            required: false,
            text: 'Brother2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_13' },
            required: false,
            text: 'Sister1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_14' },
            required: false,
            text: 'Sister2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_15' },
            required: false,
            text: 'M-Aunt1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_16' },
            required: false,
            text: 'M-Aunt2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_17' },
            required: false,
            text: 'M-Uncle1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_18' },
            required: false,
            text: 'M-Uncle2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_19' },
            required: false,
            text: 'F-Aunt1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_20' },
            required: false,
            text: 'F-Aunt2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_21' },
            required: false,
            text: 'F-Uncle1',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID47_22' },
            required: false,
            text: 'F-Uncle2',
            type: 'choice-ref',
            enumeration: 'no-yes-1-2',
        }]
    }, {
        name: 'dummy',
        questions: [{
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID197' },
            text: 'Are you known to carry a genetic mutation (PS1/PS2 or APP) that causes early onset Alzheimer\'s disease?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID198' },
            text: 'Do you have a family member (parent, grandparent, sibling, or child) who is known to carry a genetic mutation (PS1/PS2 or APP) that causes early onset Alzheimer\'s disease?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID199' },
            text: 'Did you begin to experience symptoms of Alzheimer\'s disease before age 60?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID200' },
            text: 'Do you have a family member (parent, grandparent, sibling, or child) who began to experience symptoms of Alzheimer\'s disease before age 60?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID201' },
            text: 'Are you known to be a carrier of an e4 allele of the apolipoprotein E (APOE) gene, which increases an individual\'s risk for developing late-onset Alzheimer disease?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }, {
            answerIdentifier: { type: 'bhr-gap-family-tree-column', value: 'QID202' },
            text: 'Do you have a family member (parent, grandparent, sibling, or child) who is known to be a carrier of an e4 allele of the apolipoprotein E (APOE) gene, which increases an individual\'s risk for developing late-onset Alzheimer disease?',
            required: false,
            type: 'choice-ref',
            enumeration: 'extended-yes-no'
        }]
    }]
};
