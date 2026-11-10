import { Router } from 'express';
import { createTag, deleteTag, getTag, listTags, updateTag } from '../controllers/tag.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParams } from '../validators/common';
import { tagBody, tagListQuery } from '../validators/tag';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: tagListQuery }), listTags);
router.post('/', validate({ body: tagBody }), createTag);
router.get('/:id', validate({ params: idParams }), getTag);
router.patch('/:id', validate({ params: idParams, body: tagBody }), updateTag);
router.delete('/:id', validate({ params: idParams }), deleteTag);

export default router;
