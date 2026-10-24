import type { PrismaClient } from '@prisma/client';
import seedDataRaw from '../prisma/seedData.json';

const globalForPrisma = globalThis as unknown as {
  inMemoryStore: InMemoryDatabase | undefined;
};

/**
 * In-Memory Database Store for Zero-Config Vercel Demo Deployments
 */
export class InMemoryDatabase {
  videos: any[] = [];
  segments: any[] = [];
  quizQuestions: any[] = [];
  flashcards: any[] = [];
  notes: any[] = [];
  projects: any[] = [];
  concepts: any[] = [];
  conceptRelationships: any[] = [];
  userProfiles: any[] = [];
  userProgress: any[] = [];
  userMasteries: any[] = [];
  tasks: any[] = [];
  examPlans: any[] = [];
  examItems: any[] = [];
  revisionSessions: any[] = [];
  revisionItems: any[] = [];

  constructor() {
    this.initFromSeed();
  }

  private initFromSeed() {
    try {
      const data = seedDataRaw as any;
      if (Array.isArray(data.videos)) {
        for (const v of data.videos) {
          const videoCopy = { ...v };
          this.videos.push(videoCopy);

          if (Array.isArray(v.segments)) {
            for (const s of v.segments) {
              const segCopy = { ...s, video_id: v.id };
              this.segments.push(segCopy);
              if (Array.isArray(s.quiz_questions)) {
                for (const q of s.quiz_questions) {
                  this.quizQuestions.push({ ...q, segment_id: s.id });
                }
              }
            }
          }

          if (Array.isArray(v.flashcards)) {
            for (const fc of v.flashcards) {
              this.flashcards.push({ ...fc, video_id: v.id });
            }
          }

          if (Array.isArray(v.notes)) {
            for (const n of v.notes) {
              this.notes.push({ ...n, video_id: v.id });
            }
          }

          if (Array.isArray(v.projects)) {
            for (const p of v.projects) {
              this.projects.push({ ...p, video_id: v.id });
            }
          }
        }
      }

      if (Array.isArray(data.concepts)) {
        for (const c of data.concepts) {
          this.concepts.push({ ...c });
        }
      }

      if (data.profile) {
        this.userProfiles.push({ ...data.profile });
      } else {
        this.userProfiles.push({
          id: 'default_profile',
          user_id: 'default_user',
          name: 'Student Learner',
          email: 'student@sarasai.edu',
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('[InMemoryDB] Error loading seedData.json:', e);
    }
  }

  attachVideoRelations(video: any, include?: any) {
    if (!video) return null;
    const res = { ...video };
    if (include?.segments) {
      let segs = this.segments.filter((s) => s.video_id === video.id);
      segs = [...segs].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      if (include.segments.include?.quiz_questions) {
        segs = segs.map((s) => ({
          ...s,
          quiz_questions: this.quizQuestions.filter((q) => q.segment_id === s.id),
        }));
      }
      res.segments = segs;
    }
    if (include?.flashcards) {
      res.flashcards = this.flashcards.filter((f) => f.video_id === video.id);
    }
    if (include?.notes) {
      let nList = this.notes.filter((n) => n.video_id === video.id);
      nList.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      res.notes = nList;
    }
    if (include?.projects) {
      res.projects = this.projects.filter((p) => p.video_id === video.id);
    }
    if (include?.progress) {
      res.progress = this.userProgress.filter((p) => p.video_id === video.id);
    }
    return res;
  }
}

const memory = globalForPrisma.inMemoryStore ?? new InMemoryDatabase();
if (process.env.NODE_ENV !== 'production') globalForPrisma.inMemoryStore = memory;

/**
 * Model handler for In-Memory Database
 */
function createModelHandler(modelName: string) {
  return new Proxy(
    {},
    {
      get(_target, propKey: string) {
        return async (...args: any[]) => {
          const params = args[0] || {};
          const where = params.where || {};
          const include = params.include;

          switch (modelName) {
            case 'video': {
              if (propKey === 'findUnique' || propKey === 'findFirst') {
                const match = memory.videos.find((v) => {
                  if (where.OR && Array.isArray(where.OR)) {
                    return where.OR.some((cond: any) =>
                      (cond.id && v.id === cond.id) ||
                      (cond.youtube_video_id && v.youtube_video_id === cond.youtube_video_id)
                    );
                  }
                  if (where.id && v.id === where.id) return true;
                  if (where.youtube_video_id && v.youtube_video_id === where.youtube_video_id) return true;
                  return false;
                });
                return memory.attachVideoRelations(match, include);
              }
              if (propKey === 'findMany') {
                let list = memory.videos.map((v) => memory.attachVideoRelations(v, include));
                if (params.take) list = list.slice(0, params.take);
                return list;
              }
              if (propKey === 'create') {
                const created = {
                  id: params.data.id || `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  created_at: new Date().toISOString(),
                  ...params.data,
                };
                memory.videos.push(created);
                return memory.attachVideoRelations(created, include);
              }
              if (propKey === 'update') {
                const idx = memory.videos.findIndex((v) => v.id === where.id || v.youtube_video_id === where.youtube_video_id);
                if (idx !== -1) {
                  memory.videos[idx] = { ...memory.videos[idx], ...params.data };
                  return memory.attachVideoRelations(memory.videos[idx], include);
                }
                return null;
              }
              if (propKey === 'upsert') {
                let match = memory.videos.find((v) => v.id === where.id || v.youtube_video_id === where.youtube_video_id);
                if (match) {
                  Object.assign(match, params.update);
                } else {
                  match = {
                    id: params.create.id || `vid_${Date.now()}`,
                    ...params.create,
                  };
                  memory.videos.push(match);
                }
                return memory.attachVideoRelations(match, include);
              }
              break;
            }

            case 'segment': {
              if (propKey === 'findUnique' || propKey === 'findFirst') {
                const match = memory.segments.find((s) => s.id === where.id);
                if (!match) return null;
                const res = { ...match };
                if (include?.quiz_questions) {
                  res.quiz_questions = memory.quizQuestions.filter((q) => q.segment_id === match.id);
                }
                return res;
              }
              if (propKey === 'findMany') {
                let list = memory.segments.filter((s) => {
                  if (where.video_id && s.video_id !== where.video_id) return false;
                  return true;
                });
                if (include?.quiz_questions) {
                  list = list.map((s) => ({
                    ...s,
                    quiz_questions: memory.quizQuestions.filter((q) => q.segment_id === s.id),
                  }));
                }
                if (params.orderBy?.order_index === 'asc') {
                  list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                }
                return list;
              }
              if (propKey === 'create') {
                const created = {
                  id: params.data.id || `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  ...params.data,
                };
                memory.segments.push(created);
                return created;
              }
              if (propKey === 'createMany') {
                const items = params.data || [];
                for (const item of items) {
                  memory.segments.push({
                    id: item.id || `seg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...item,
                  });
                }
                return { count: items.length };
              }
              if (propKey === 'update') {
                const idx = memory.segments.findIndex((s) => s.id === where.id);
                if (idx !== -1) {
                  memory.segments[idx] = { ...memory.segments[idx], ...params.data };
                  return memory.segments[idx];
                }
                return null;
              }
              break;
            }

            case 'quizQuestion': {
              if (propKey === 'findMany') {
                return memory.quizQuestions.filter((q) => {
                  if (where.segment_id && q.segment_id !== where.segment_id) return false;
                  return true;
                });
              }
              if (propKey === 'create') {
                const created = { id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...params.data };
                memory.quizQuestions.push(created);
                return created;
              }
              if (propKey === 'createMany') {
                const items = params.data || [];
                for (const item of items) {
                  memory.quizQuestions.push({
                    id: item.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...item,
                  });
                }
                return { count: items.length };
              }
              break;
            }

            case 'flashcard': {
              if (propKey === 'findMany') {
                return memory.flashcards.filter((f) => {
                  if (where.video_id && f.video_id !== where.video_id) return false;
                  return true;
                });
              }
              if (propKey === 'create') {
                const created = { id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...params.data };
                memory.flashcards.push(created);
                return created;
              }
              if (propKey === 'createMany') {
                const items = params.data || [];
                for (const item of items) {
                  memory.flashcards.push({
                    id: item.id || `fc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...item,
                  });
                }
                return { count: items.length };
              }
              if (propKey === 'update') {
                const idx = memory.flashcards.findIndex((f) => f.id === where.id);
                if (idx !== -1) {
                  memory.flashcards[idx] = { ...memory.flashcards[idx], ...params.data };
                  return memory.flashcards[idx];
                }
                return null;
              }
              break;
            }

            case 'smartNote':
            case 'note': {
              if (propKey === 'findMany') {
                let list = memory.notes.filter((n) => {
                  if (where.video_id && n.video_id !== where.video_id) return false;
                  return true;
                });
                if (params.orderBy?.order_index === 'asc') {
                  list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
                }
                return list;
              }
              if (propKey === 'create') {
                const created = { id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, ...params.data };
                memory.notes.push(created);
                return created;
              }
              if (propKey === 'createMany') {
                const items = params.data || [];
                for (const item of items) {
                  memory.notes.push({
                    id: item.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    ...item,
                  });
                }
                return { count: items.length };
              }
              break;
            }

            case 'userProgress':
            case 'userVideoProgress': {
              const findKey = (p: any) => {
                if (where.id && p.id === where.id) return true;
                if (where.video_id && where.user_id && p.video_id === where.video_id && p.user_id === where.user_id) return true;
                if (where.video_id_user_id && p.video_id === where.video_id_user_id.video_id && p.user_id === where.video_id_user_id.user_id) return true;
                return false;
              };

              if (propKey === 'findUnique' || propKey === 'findFirst') {
                return memory.userProgress.find(findKey) || null;
              }
              if (propKey === 'findMany') {
                return memory.userProgress.filter((p) => {
                  if (where.user_id && p.user_id !== where.user_id) return false;
                  return true;
                });
              }
              if (propKey === 'upsert') {
                let existing = memory.userProgress.find(findKey);
                if (existing) {
                  Object.assign(existing, params.update);
                  existing.last_watched_at = new Date().toISOString();
                  return existing;
                }
                const created = {
                  id: `up_${Date.now()}`,
                  current_segment_index: 0,
                  completed_segment_ids: '[]',
                  last_watched_at: new Date().toISOString(),
                  ...params.create,
                };
                memory.userProgress.push(created);
                return created;
              }
              if (propKey === 'create') {
                const created = { id: `up_${Date.now()}`, ...params.data };
                memory.userProgress.push(created);
                return created;
              }
              if (propKey === 'update') {
                const match = memory.userProgress.find(findKey);
                if (match) {
                  Object.assign(match, params.data);
                  return match;
                }
                return null;
              }
              break;
            }

            case 'userProfile': {
              if (propKey === 'findUnique' || propKey === 'findFirst') {
                return memory.userProfiles[0] || null;
              }
              if (propKey === 'upsert' || propKey === 'update') {
                if (memory.userProfiles[0]) {
                  Object.assign(memory.userProfiles[0], params.update || params.data || {});
                  return memory.userProfiles[0];
                }
                const created = { id: 'default_profile', ...params.create, ...params.data };
                memory.userProfiles.push(created);
                return created;
              }
              break;
            }

            case 'concept': {
              if (propKey === 'findMany') {
                return memory.concepts.map((c) => ({
                  ...c,
                  related_from: memory.conceptRelationships.filter((r) => r.source_concept_id === c.id),
                  related_to: memory.conceptRelationships.filter((r) => r.target_concept_id === c.id),
                  user_mastery: memory.userMasteries.filter((m) => m.concept_id === c.id),
                }));
              }
              if (propKey === 'create') {
                const created = { id: `c_${Date.now()}`, ...params.data };
                memory.concepts.push(created);
                return created;
              }
              break;
            }

            case 'conceptRelationship': {
              if (propKey === 'findMany') {
                return memory.conceptRelationships;
              }
              if (propKey === 'create') {
                const created = { id: `cr_${Date.now()}`, ...params.data };
                memory.conceptRelationships.push(created);
                return created;
              }
              break;
            }

            case 'userMastery':
            case 'userConceptMastery': {
              if (propKey === 'findMany') {
                return memory.userMasteries.filter((m) => {
                  if (where.user_id && m.user_id !== where.user_id) return false;
                  return true;
                });
              }
              if (propKey === 'upsert') {
                const match = memory.userMasteries.find(
                  (m) =>
                    (where.concept_id && where.user_id && m.concept_id === where.concept_id && m.user_id === where.user_id) ||
                    (where.concept_id_user_id && m.concept_id === where.concept_id_user_id.concept_id && m.user_id === where.concept_id_user_id.user_id)
                );
                if (match) {
                  Object.assign(match, params.update);
                  return match;
                }
                const created = { id: `um_${Date.now()}`, ...params.create };
                memory.userMasteries.push(created);
                return created;
              }
              break;
            }

            case 'task': {
              if (propKey === 'findMany') return memory.tasks;
              if (propKey === 'create') {
                const created = { id: `task_${Date.now()}`, ...params.data };
                memory.tasks.push(created);
                return created;
              }
              if (propKey === 'update') {
                const match = memory.tasks.find((t) => t.id === where.id);
                if (match) Object.assign(match, params.data);
                return match;
              }
              break;
            }

            case 'project': {
              if (propKey === 'findMany' || propKey === 'findFirst' || propKey === 'findUnique') {
                const list = memory.projects.map((p) => ({
                  ...p,
                  milestones: typeof p.milestones === 'string' ? JSON.parse(p.milestones) : p.milestones || [],
                }));
                if (propKey === 'findUnique' || propKey === 'findFirst') {
                  return list.find((p) => p.id === where.id) || null;
                }
                return list;
              }
              if (propKey === 'create') {
                const created = { id: `proj_${Date.now()}`, ...params.data };
                memory.projects.push(created);
                return created;
              }
              break;
            }

            case 'examPlan': {
              if (propKey === 'findMany' || propKey === 'findFirst' || propKey === 'findUnique') {
                const list = memory.examPlans.map((ep) => ({
                  ...ep,
                  items: memory.examItems.filter((i) => i.plan_id === ep.id),
                }));
                if (propKey === 'findUnique' || propKey === 'findFirst') {
                  return list.find((p) => p.id === where.id) || null;
                }
                return list;
              }
              if (propKey === 'create') {
                const created = { id: `exam_${Date.now()}`, ...params.data };
                memory.examPlans.push(created);
                return created;
              }
              break;
            }

            default:
              return null;
          }

          return null;
        };
      },
    }
  );
}

/**
 * Universal Zero-Database Client for Seamless Vercel Deployment
 */
export const db: PrismaClient = new Proxy(
  {},
  {
    get(_target, propKey: string) {
      if (propKey === '$transaction') {
        return async (arg: any) => {
          if (Array.isArray(arg)) {
            return Promise.all(arg);
          }
          if (typeof arg === 'function') {
            return arg(db);
          }
          return null;
        };
      }
      return createModelHandler(propKey);
    },
  }
) as unknown as PrismaClient;

