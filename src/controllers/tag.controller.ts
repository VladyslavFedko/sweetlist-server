import type { Request, Response } from 'express';
import { Op } from 'sequelize';
import { RecipeTag, Tag } from '../models';
import { AppError } from '../utils/AppError';
import { escapeLike, parsedQuery, slugify } from '../utils/helpers';

export async function listTags(_req: Request, res: Response) {
  const { q, limit } = parsedQuery<{ q?: string; limit: number }>(res);
  const tags = await Tag.findAll({
    where: q ? { slug: { [Op.like]: `${escapeLike(slugify(q))}%` } } : {},
    order: [['name', 'ASC']],
    limit,
  });
  res.json({ data: tags });
}

export async function getTag(req: Request, res: Response) {
  const tag = await Tag.findByPk(req.params.id as string);
  if (!tag) throw AppError.notFound('Tag');
  res.json({ data: tag });
}

export async function createTag(req: Request, res: Response) {
  const name: string = req.body.name;
  const [tag, created] = await Tag.findOrCreate({ where: { slug: slugify(name) }, defaults: { name, slug: slugify(name) } });
  res.status(created ? 201 : 200).json({ data: tag });
}

export async function updateTag(req: Request, res: Response) {
  const tag = await Tag.findByPk(req.params.id as string);
  if (!tag) throw AppError.notFound('Tag');
  const name: string = req.body.name;
  const slug = slugify(name);
  if (slug !== tag.slug && (await Tag.count({ where: { slug } }))) {
    throw AppError.conflict('A tag with this name already exists', 'TAG_EXISTS');
  }
  await tag.update({ name, slug });
  res.json({ data: tag });
}

export async function deleteTag(req: Request, res: Response) {
  const tag = await Tag.findByPk(req.params.id as string);
  if (!tag) throw AppError.notFound('Tag');
  if (await RecipeTag.count({ where: { tagId: tag.id } })) {
    throw AppError.conflict('This tag is used by recipes and cannot be deleted', 'TAG_IN_USE');
  }
  await tag.destroy();
  res.status(204).end();
}
