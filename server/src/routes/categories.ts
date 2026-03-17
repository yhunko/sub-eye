import { Hono } from "hono";
import { vValidator } from "@hono/valibot-validator";
import { object, string } from "valibot";
import {
  CategoryAiOptimizeApplyInputSchema,
  CategoryAiApplyInputSchema,
  CreateCategorySchema,
  DeleteCategoriesInputSchema,
  UpdateCategorySchema,
} from "shared";
import { CategoryService } from "../domains/category/categoryService";
import { CategoryAiService } from "../domains/category/categoryAiService";
import { requireUserId } from "../utils/authUtils";
import { protect } from "../middleware/auth";
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
  .post("/ai/suggest", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const response = await CategoryAiService.suggestCategories(userId);
      return context.json(response);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post("/ai/optimize/suggest", protect, async (context) => {
    const userId = requireUserId(context);
    try {
      const response = await CategoryAiService.suggestOptimization(userId);
      return context.json(response);
    } catch (error) {
      return handleServiceError(context, error);
    }
  })
  .post(
    "/ai/optimize/apply",
    protect,
    vValidator("json", CategoryAiOptimizeApplyInputSchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const payload = context.req.valid("json");
        const response = await CategoryAiService.applyOptimization(
          userId,
          payload,
        );
        return context.json(response);
      } catch (error) {
        return handleServiceError(context, error);
      }
    },
  )
  .post(
    "/ai/apply",
    protect,
    vValidator("json", CategoryAiApplyInputSchema),
    async (context) => {
      const userId = requireUserId(context);
      try {
        const payload = context.req.valid("json");
        const response = await CategoryAiService.applyCategories(
          userId,
          payload,
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
