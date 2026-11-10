import { Router } from 'express';
import {
  activatePremium,
  cancelPremium,
  changePassword,
  deleteAvatar,
  deleteMe,
  getMe,
  updateMe,
  uploadAvatar,
} from '../controllers/user.controller';
import { requireAuth } from '../middleware/auth';
import { imageUpload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { changePasswordBody, deleteAccountBody, updateProfileBody } from '../validators/auth';

const router = Router();
const avatarUpload = imageUpload('avatars', 5);

router.use(requireAuth);

router.get('/me', getMe);
router.patch('/me', validate({ body: updateProfileBody }), updateMe);
router.delete('/me', validate({ body: deleteAccountBody }), deleteMe);
router.put('/me/password', validate({ body: changePasswordBody }), changePassword);
router.post('/me/avatar', avatarUpload.single('avatar'), uploadAvatar);
router.delete('/me/avatar', deleteAvatar);
router.post('/me/premium', activatePremium);
router.delete('/me/premium', cancelPremium);

export default router;
