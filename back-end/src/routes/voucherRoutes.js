const express = require('express');
const router = express.Router();
const { getVouchers, createVoucher, updateVoucher, deleteVoucher, validateVoucher } = require('../controllers/voucherController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/validate', validateVoucher);

router.route('/')
    .get(protect, authorize('organizer', 'admin'), getVouchers)
    .post(protect, authorize('organizer', 'admin'), createVoucher);

router.route('/:id')
    .put(protect, authorize('organizer', 'admin'), updateVoucher)
    .delete(protect, authorize('organizer', 'admin'), deleteVoucher);

module.exports = router;
