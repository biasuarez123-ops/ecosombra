const express = require('express');
const router = express.Router();
const shadeController = require('../controllers/shadeController');
const { ensureAuth } = require('../middlewares/auth');

// Rotas públicas (consulta)
router.get('/', shadeController.listShades);
router.get('/:id', shadeController.getShadeById);

// Rotas protegidas (exigem autenticação)
router.post('/', ensureAuth, shadeController.createShade);
router.put('/:id', ensureAuth, shadeController.updateShade);
router.delete('/:id', ensureAuth, shadeController.deleteShade);

module.exports = router;
