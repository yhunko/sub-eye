import { vValidator } from "@hono/valibot-validator";
import {
  CreateCategorySchema,
  DeleteCategoriesInputSchema,
  UpdateCategorySchema,
} from "@subeye/shared";
import { Hono } from "hono";
import { object, string } from "valibot";
import { CategoryService } from "../domains/category/categoryService";
import { protect } from "../middleware/auth";
import { requireUserId } from "../utils/authUtils";
import { handleServiceError } from "../utils/routeUtils";

const idParamSchema = object({ id: string() });

export const categoryRouter = new Hono()
  .get("/", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const categories = await CategoryService.getCategories(userId);
      return context.json(categories);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post(
    "/",
    protect,
    vValidator("json", CreateCategorySchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const payload = context.req.valid("json");
        const category = await CategoryService.createCategory(userId, payload);
        return context.json(category, 201);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/batch/delete",
    protect,
    vValidator("json", DeleteCategoriesInputSchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const payload = context.req.valid("json");
        const response = await CategoryService.deleteCategories(
          payload.ids,
          userId,
        );
        return context.json(response);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .patch(
    "/:id",
    protect,
    vValidator("param", idParamSchema),
    vValidator("json", UpdateCategorySchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const { id } = context.req.valid("param");
        const payload = context.req.valid("json");
        const category = await CategoryService.updateCategory(
          id,
          userId,
          payload,
        );
        return context.json(category);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .delete(
    "/:id",
    protect,
    vValidator("param", idParamSchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const { id } = context.req.valid("param");
        await CategoryService.deleteCategory(id, userId);
        return new Response("", { status: 204 });
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  );
