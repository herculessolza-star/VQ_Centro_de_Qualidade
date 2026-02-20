
import { DefectRecord, OKCarRecord, DowntimeRecord } from '../types';

declare const firebase: any;

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let db: any = null;

export const cloudService = {
  isConfigured: () => !!localStorage.getItem('vq_firebase_config'),

  saveConfig: (config: FirebaseConfig) => {
    localStorage.setItem('vq_firebase_config', JSON.stringify(config));
    window.location.reload();
  },

  init: () => {
    const configStr = localStorage.getItem('vq_firebase_config');
    if (configStr && !firebase.apps.length) {
      try {
        const config = JSON.parse(configStr);
        firebase.initializeApp(config);
        db = firebase.firestore();
        // Habilita persistência offline se possível
        db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
        return true;
      } catch (e) {
        console.error("Erro ao inicializar Firebase:", e);
        return false;
      }
    }
    return !!db || (firebase.apps.length > 0 && (db = firebase.firestore()));
  },

  // Listeners em tempo real
  subscribe: (workspaceId: string, collection: string, callback: (data: any[]) => void) => {
    if (!db) return () => {};
    return db.collection(`workspaces/${workspaceId}/${collection}`)
      .orderBy('timestamp', 'desc')
      .onSnapshot((snapshot: any) => {
        const items: any[] = [];
        snapshot.forEach((doc: any) => items.push({ id: doc.id, ...doc.data() }));
        callback(items);
      }, (error: any) => {
        console.error(`Erro ao escutar ${collection}:`, error);
      });
  },

  // Operações de escrita
  save: async (workspaceId: string, collection: string, data: any) => {
    if (!db) throw new Error("Cloud não inicializada");
    const collRef = db.collection(`workspaces/${workspaceId}/${collection}`);
    
    if (data.id) {
      const id = data.id;
      const cleanData = { ...data };
      delete cleanData.id;
      return collRef.doc(id).set(cleanData, { merge: true });
    }
    
    return collRef.add(data);
  },

  delete: async (workspaceId: string, collection: string, id: string) => {
    if (!db) return;
    return db.collection(`workspaces/${workspaceId}/${collection}`).doc(id).delete();
  },

  clearAll: async (workspaceId: string) => {
    if (!db) return;
    const collections = ['defects', 'okCars', 'downtime'];
    for (const collName of collections) {
      const snapshot = await db.collection(`workspaces/${workspaceId}/${collName}`).get();
      const batch = db.batch();
      snapshot.forEach((doc: any) => batch.delete(doc.ref));
      await batch.commit();
    }
  }
};
