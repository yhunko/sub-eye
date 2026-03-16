import {
  minLength,
  nullable,
  object,
  optional,
  pipe,
  string,
  transform,
  type InferOutput,
} from "valibot";

export const CategoryDtoSchema = object({
  id: string(),
  userId: string(),
  name: string(),
  emoji: string(),
  createdAt: string(),
  updatedAt: string(),
});

export const CreateCategorySchema = object({
  name: pipe(
    string(),
    transform((v) => v.trim()),
    minLength(1),
  ),
  emoji: pipe(string(), minLength(1)),
});

export const UpdateCategorySchema = object({
  name: optional(
    pipe(
      string(),
      transform((v) => v.trim()),
      minLength(1),
    ),
  ),
  emoji: optional(pipe(string(), minLength(1))),
});

export type CategoryDto = InferOutput<typeof CategoryDtoSchema>;
export type CreateCategoryInput = InferOutput<typeof CreateCategorySchema>;
export type UpdateCategoryInput = InferOutput<typeof UpdateCategorySchema>;

export const categoryIdSchema = optional(
  nullable(pipe(string(), minLength(1))),
);
