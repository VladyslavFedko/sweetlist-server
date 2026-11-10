import bcrypt from 'bcryptjs';
import { Ingredient, Recipe, RecipeShare, RecipeStep, RecipeTag, Tag, User, sequelize } from '../models';
import type { IngredientCategory, IngredientUnit } from '../models/ingredient';
import type { ServingsUnit } from '../models/recipe';

/** Demo data taken from the Figma design (Олена Коваль, Наполеон, Чізкейк Нью-Йорк, Макаронс...). */

type Ing = [name: string, quantity: number, unit: IngredientUnit, category: IngredientCategory];
interface Seed {
  title: string;
  description: string;
  prep: number;
  rest?: number;
  servings: number;
  servingsUnit?: ServingsUnit;
  tags: string[];
  ingredients: Ing[];
  steps: [title: string, instruction: string][];
}

const RECIPES: Seed[] = [
  {
    title: 'Наполеон',
    description: 'Тонкі хрусткі коржі та ніжний ванільний крем зі збитими вершками. Домашня класика для особливих моментів.',
    prep: 150,
    rest: 480,
    servings: 12,
    tags: ['Торти', 'Класика'],
    ingredients: [
      ['Борошно', 500, 'g', 'dry'],
      ['Вершкове масло', 400, 'g', 'dairy'],
      ['Цукрова пудра', 200, 'g', 'dry'],
      ['Яйця', 4, 'pcs', 'eggs'],
      ['Вершки 33%', 500, 'ml', 'dairy'],
      ['Вода', 150, 'ml', 'other'],
      ['Сіль', 2, 'g', 'other'],
      ['Ванільний цукор', 10, 'g', 'dry'],
    ],
    steps: [
      ['Замісіть тісто', 'Перетріть 450 г борошна з 300 г холодного масла. Додайте 150 мл води, 1 яйце та 2 г солі. Швидко замісіть, поділіть на 10 частин і охолодіть 30 хв.'],
      ['Спечіть коржі', 'Тонко розкачайте кожну частину. Наколіть виделкою й випікайте при 200 °C по 5–7 хв до золотистості. Остудіть; обрізки збережіть для крихти.'],
      ['Приготуйте основу крему', 'Змішайте 3 яйця, 150 г цукрової пудри, решту 50 г борошна та 10 г ванільного цукру. Влийте 300 мл вершків. Нагрівайте, помішуючи, до загустіння та 82 °C.'],
      ['Завершіть крем', 'Охолодіть основу до кімнатної температури. Збийте зі 100 г м’якого масла. Окремо збийте решту 200 мл холодних вершків із 50 г пудри й обережно вмішайте.'],
      ['Зберіть і дайте настоятися', 'Промастіть коржі кремом, покрийте верх і боки крихтою. Залиште в холодильнику на 8 годин. Наріжте на 12 порцій перед подачею.'],
    ],
  },
  {
    title: 'Чізкейк Нью-Йорк',
    description: 'Щільний вершковий чізкейк на пісочній основі.',
    prep: 100,
    servings: 8,
    tags: ['Торти', 'Десерти'],
    ingredients: [
      ['Борошно', 100, 'g', 'dry'],
      ['Вершкове масло', 100, 'g', 'dairy'],
      ['Цукрова пудра', 150, 'g', 'dry'],
      ['Яйця', 3, 'pcs', 'eggs'],
      ['Вершки 33%', 250, 'ml', 'dairy'],
      ['Крем-сир', 600, 'g', 'dairy'],
      ['Лимонний сік', 15, 'ml', 'other'],
    ],
    steps: [
      ['Підготуйте основу', 'Змішайте борошно, масло та частину пудри, викладіть у форму й підпеч 10 хв.'],
      ['Приготуйте начинку', 'Збийте крем-сир із пудрою, яйцями, вершками та лимонним соком до однорідності.'],
      ['Випікайте', 'Випікайте на водяній бані при 160 °C близько години, потім охолодіть у вимкненій духовці.'],
    ],
  },
  {
    title: 'Макаронс',
    description: 'Мигдальні тістечка з ніжною начинкою.',
    prep: 80,
    servings: 24,
    servingsUnit: 'pieces',
    tags: ['Тістечка'],
    ingredients: [
      ['Мигдальне борошно', 150, 'g', 'dry'],
      ['Цукрова пудра', 150, 'g', 'dry'],
      ['Цукор', 150, 'g', 'dry'],
      ['Яєчні білки', 110, 'g', 'eggs'],
      ['Білий шоколад', 150, 'g', 'other'],
      ['Вершки 33%', 100, 'ml', 'dairy'],
    ],
    steps: [
      ['Підготуйте суміш', 'Просійте мигдальне борошно з пудрою.'],
      ['Зваріть меренгу', 'Збийте білки з цукром до стійких піків і обережно змішайте з сухою сумішшю.'],
      ['Випечіть і наповніть', 'Випікайте корпуси, а після охолодження склейте ганашем із білого шоколаду та вершків.'],
    ],
  },
];

async function main() {
  await sequelize.sync();

  const passwordHash = await bcrypt.hash('password123', 12);
  const [olena] = await User.unscoped().findOrCreate({
    where: { email: 'olena@example.com' },
    defaults: {
      email: 'olena@example.com',
      username: 'olena',
      name: 'Олена Коваль',
      passwordHash,
      bio: 'Готую з любов’ю, ділюся солодким. Мій ідеальний день пахне ваніллю.',
      premiumUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
  const [maria] = await User.unscoped().findOrCreate({
    where: { email: 'maria@example.com' },
    defaults: { email: 'maria@example.com', username: 'maria', name: 'Марія Бондар', passwordHash },
  });

  if ((await Recipe.count({ where: { authorId: olena.id } })) === 0) {
    for (const seed of RECIPES) {
      const recipe = await Recipe.create({
        authorId: olena.id,
        title: seed.title,
        description: seed.description,
        prepTimeMinutes: seed.prep,
        restTimeMinutes: seed.rest ?? 0,
        servings: seed.servings,
        servingsUnit: seed.servingsUnit ?? 'portions',
      });
      await Ingredient.bulkCreate(
        seed.ingredients.map(([name, quantity, unit, category], position) => ({
          recipeId: recipe.id, name, quantity, unit, category, position,
        })),
      );
      await RecipeStep.bulkCreate(
        seed.steps.map(([title, instruction], position) => ({ recipeId: recipe.id, title, instruction, position })),
      );
      for (const name of seed.tags) {
        const [tag] = await Tag.findOrCreate({ where: { slug: name.toLowerCase() }, defaults: { name, slug: name.toLowerCase() } });
        await RecipeTag.create({ recipeId: recipe.id, tagId: tag.id });
      }
    }
    // Maria receives the cheesecake as a shared recipe.
    const cheesecake = await Recipe.findOne({ where: { authorId: olena.id, title: 'Чізкейк Нью-Йорк' } });
    if (cheesecake) await RecipeShare.findOrCreate({ where: { recipeId: cheesecake.id, sharedWithUserId: maria.id } });
  }

  console.log('Seeded. Log in with olena@example.com / password123 (Premium) or maria@example.com / password123');
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
