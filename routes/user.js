const express = require('express');
const router = express.Router();

const {
    authenticateToken,
    getUserProfile,
    getDatabase_users_accounts
} = require('../controllers/web_controllers.js')


router.route('/profile').get(authenticateToken,getUserProfile);
router.route('/database').get(getDatabase_users_accounts);

module.exports = router;