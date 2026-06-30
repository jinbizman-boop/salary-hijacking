import type {
  CommunityComment,
  CommunityFeedQuery,
  CommunityPageMeta,
  CommunityPost,
} from "./community.types";

export type CommunityFeedStatus =
  | "idle"
  | "loading"
  | "ready"
  | "stale"
  | "error";

export type CommunityStoreState = Readonly<{
  feed: Readonly<{
    status: CommunityFeedStatus;
    query: CommunityFeedQuery;
    items: readonly CommunityPost[];
    meta: CommunityPageMeta;
    error: string | null;
  }>;
  selectedPost: CommunityPost | null;
  commentsByPostId: Readonly<Record<string, readonly CommunityComment[]>>;
}>;

export type CommunityStore = Readonly<{
  getState: () => CommunityStoreState;
  subscribe: (listener: () => void) => () => void;
  beginFeed: (query: CommunityFeedQuery) => void;
  receiveFeed: (
    items: readonly CommunityPost[],
    meta: CommunityPageMeta,
    append: boolean,
  ) => void;
  failFeed: (message: string) => void;
  selectPost: (post: CommunityPost | null) => void;
  upsertPost: (post: CommunityPost) => void;
  removePost: (postId: string) => void;
  setComments: (postId: string, comments: readonly CommunityComment[]) => void;
  upsertComment: (comment: CommunityComment) => void;
  removeComment: (postId: string, commentId: string) => void;
  reset: () => void;
}>;

const DEFAULT_META: CommunityPageMeta = Object.freeze({
  page: 1,
  pageSize: 20,
  total: 0,
});

function initialState(): CommunityStoreState {
  return {
    feed: {
      status: "idle",
      query: {},
      items: [],
      meta: DEFAULT_META,
      error: null,
    },
    selectedPost: null,
    commentsByPostId: {},
  };
}

function mergePosts(
  current: readonly CommunityPost[],
  incoming: readonly CommunityPost[],
): readonly CommunityPost[] {
  const byId = new Map(current.map((post) => [post.id, post]));
  for (const post of incoming) byId.set(post.id, post);
  return [...byId.values()];
}

function mergeComments(
  current: readonly CommunityComment[],
  incoming: readonly CommunityComment[],
): readonly CommunityComment[] {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of incoming) byId.set(comment.id, comment);
  return [...byId.values()];
}

export function createCommunityStore(): CommunityStore {
  let state = initialState();
  const listeners = new Set<() => void>();

  function setState(next: CommunityStoreState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    beginFeed(query) {
      setState({
        ...state,
        feed: {
          ...state.feed,
          status: "loading",
          query,
          error: null,
        },
      });
    },

    receiveFeed(items, meta, append) {
      setState({
        ...state,
        feed: {
          ...state.feed,
          status: "ready",
          items: append ? mergePosts(state.feed.items, items) : [...items],
          meta,
          error: null,
        },
      });
    },

    failFeed(message) {
      setState({
        ...state,
        feed: {
          ...state.feed,
          status: state.feed.items.length > 0 ? "stale" : "error",
          error: message,
        },
      });
    },

    selectPost(post) {
      setState({ ...state, selectedPost: post });
    },

    upsertPost(post) {
      setState({
        ...state,
        selectedPost:
          state.selectedPost?.id === post.id ? post : state.selectedPost,
        feed: {
          ...state.feed,
          items: mergePosts(state.feed.items, [post]),
        },
      });
    },

    removePost(postId) {
      setState({
        ...state,
        selectedPost:
          state.selectedPost?.id === postId ? null : state.selectedPost,
        feed: {
          ...state.feed,
          items: state.feed.items.filter((post) => post.id !== postId),
        },
      });
    },

    setComments(postId, comments) {
      setState({
        ...state,
        commentsByPostId: {
          ...state.commentsByPostId,
          [postId]: [...comments],
        },
      });
    },

    upsertComment(comment) {
      const current = state.commentsByPostId[comment.postId] ?? [];
      setState({
        ...state,
        commentsByPostId: {
          ...state.commentsByPostId,
          [comment.postId]: mergeComments(current, [comment]),
        },
      });
    },

    removeComment(postId, commentId) {
      const current = state.commentsByPostId[postId] ?? [];
      setState({
        ...state,
        commentsByPostId: {
          ...state.commentsByPostId,
          [postId]: current.filter((comment) => comment.id !== commentId),
        },
      });
    },

    reset() {
      setState(initialState());
    },
  };
}

export const communityStore = createCommunityStore();
