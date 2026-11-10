import type { User } from '../models/user';

/** Public representation of the account owner. The password hash is excluded by the User default scope. */
export const userView = (user: User) => ({ ...user.toJSON(), isPremium: user.isPremium });
