const { ForumPost, ForumComment, ForumLike, User } = require('../models');
const ApiResponse = require('../utils/response');
const logger = require('../utils/logger');

// List forum posts with pagination and optional author filter
const listPosts = async (req, res) => {
  try {
    const { user_id, page, limit } = req.query;
    const pageNumber = page ? parseInt(page, 10) : 1;
    const pageSize = limit ? parseInt(limit, 10) : 20;

    const where = {};
    if (user_id) where.user_id = user_id;

    const posts = await ForumPost.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'system_role'] },
        { model: ForumLike, as: 'likes', attributes: ['id'] },
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (pageNumber - 1) * pageSize,
    });

    const formatted = posts.rows.map((post) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      user_id: post.user_id,
      author: post.author,
      likes_count: post.likes.length,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }));

    return ApiResponse.success(res, {
      posts: formatted,
      pagination: {
        total: posts.count,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.ceil(posts.count / pageSize),
      },
    });
  } catch (error) {
    logger.error('listPosts error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await ForumPost.findByPk(postId, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'system_role'] },
        {
          model: ForumComment,
          as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'system_role'] }],
          order: [['created_at', 'ASC']],
        },
        { model: ForumLike, as: 'likes', attributes: ['id', 'user_id'] },
      ],
    });

    if (!post) {
      return ApiResponse.notFound(res, 'Forum post not found');
    }

    return ApiResponse.success(res, {
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author,
      comments: post.comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        author: comment.author,
        user_id: comment.user_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      })),
      likes_count: post.likes.length,
      liked_by: post.likes.map((like) => like.user_id),
      created_at: post.created_at,
      updated_at: post.updated_at,
    });
  } catch (error) {
    logger.error('getPostById error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    const post = await ForumPost.create({ title: title.trim(), content: content.trim(), user_id: userId });

    return ApiResponse.created(res, post, 'Forum post created successfully');
  } catch (error) {
    logger.error('createPost error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    const post = await ForumPost.findByPk(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Forum post not found');
    }

    if (post.user_id !== userId) {
      return ApiResponse.forbidden(res, 'Not allowed to edit this post');
    }

    await post.update({
      title: title != null ? title.trim() : post.title,
      content: content != null ? content.trim() : post.content,
    });

    return ApiResponse.success(res, post, 'Forum post updated successfully');
  } catch (error) {
    logger.error('updatePost error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await ForumPost.findByPk(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Forum post not found');
    }

    if (post.user_id !== userId) {
      return ApiResponse.forbidden(res, 'Not allowed to delete this post');
    }

    await post.destroy();
    return ApiResponse.success(res, null, 'Forum post deleted successfully');
  } catch (error) {
    logger.error('deletePost error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const post = await ForumPost.findByPk(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Forum post not found');
    }

    const comment = await ForumComment.create({ post_id: postId, user_id: userId, content: content.trim() });
    return ApiResponse.created(res, comment, 'Comment added successfully');
  } catch (error) {
    logger.error('addComment error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await ForumComment.findByPk(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }

    if (comment.user_id !== userId) {
      return ApiResponse.forbidden(res, 'Not allowed to edit this comment');
    }

    await comment.update({ content: content.trim() });
    return ApiResponse.success(res, comment, 'Comment updated successfully');
  } catch (error) {
    logger.error('updateComment error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await ForumComment.findByPk(commentId);
    if (!comment) {
      return ApiResponse.notFound(res, 'Comment not found');
    }

    if (comment.user_id !== userId) {
      return ApiResponse.forbidden(res, 'Not allowed to delete this comment');
    }

    await comment.destroy();
    return ApiResponse.success(res, null, 'Comment deleted successfully');
  } catch (error) {
    logger.error('deleteComment error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await ForumPost.findByPk(postId);
    if (!post) {
      return ApiResponse.notFound(res, 'Forum post not found');
    }

    const existing = await ForumLike.findOne({ where: { post_id: postId, user_id: userId } });
    if (existing) {
      return ApiResponse.conflict(res, 'Already liked this post');
    }

    const like = await ForumLike.create({ post_id: postId, user_id: userId });
    return ApiResponse.created(res, like, 'Post liked successfully');
  } catch (error) {
    logger.error('likePost error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const like = await ForumLike.findOne({ where: { post_id: postId, user_id: userId } });
    if (!like) {
      return ApiResponse.notFound(res, 'Like not found');
    }

    await like.destroy();
    return ApiResponse.success(res, null, 'Like removed successfully');
  } catch (error) {
    logger.error('unlikePost error:', error);
    return ApiResponse.error(res, 'Internal server error', 500);
  }
};

module.exports = {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  likePost,
  unlikePost,
};
