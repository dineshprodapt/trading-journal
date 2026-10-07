import { firebaseConfig } from './firebase.config';
// Real Firebase storage. Enable demo only for sample-data UI tests.
export const environment = { production: false, demo: false, firebase: firebaseConfig };
