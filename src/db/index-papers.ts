import { db } from './index';
import { uploadedPapers } from './schema';
import { paperChats } from './schema-papers';

// Reuse existing database connection
export { db as dbPapers };
export { uploadedPapers as papers };
export { paperChats };
