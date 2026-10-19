import multer from 'multer';

// Use memory storage to process spreadsheet buffers directly in memory
const storage = multer.memoryStorage();

export const uploadExcel = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const originalName = (file.originalname || '').toLowerCase();
    const isSupportedExt =
      originalName.endsWith('.xlsx') ||
      originalName.endsWith('.xls') ||
      originalName.endsWith('.csv');

    const isSupportedMime =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/csv' ||
      file.mimetype === 'text/plain' ||
      file.mimetype === 'application/octet-stream';

    if (isSupportedExt || isSupportedMime) {
      cb(null, true);
    } else {
      const error = new Error('Unsupported file format. Please upload an Excel spreadsheet (.xlsx, .xls) or a CSV file.');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      error.statusCode = 400;
      cb(error);
    }
  },
});
