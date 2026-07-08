import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { upload } from '../controllers/uploadController.js';

const router = Router();

/* =========================================
   SUBIR ARCHIVO
========================================= */

router.post(
    '/:modulo',
    verifyToken,
    upload.single('file'),
    (req, res) => {

        res.json({
            success: true,
            filename: req.file.filename
        });

    }
);

export default router;
