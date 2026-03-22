const express = require('express');
const router = express.Router();
const { getMyTickets, getTicketById, validateTicket } = require('../controllers/ticketController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getMyTickets);
router.post('/validate', authorize('organizer'), validateTicket);
router.get('/:id', getTicketById);

module.exports = router;
