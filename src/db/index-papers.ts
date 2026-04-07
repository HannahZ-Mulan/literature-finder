import { db } from './index';
import { uploadedPapers } from './schema';

// Reuse existing database connection
export { db as dbPapers };
export { uploadedPapers as papers };
