import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FriendshipService } from './friendship.service';
import { Friendship } from '../domain/friendship.entity';
import { UsersService } from '../users/users.service';
import { FriendshipStatus } from '../common/enums';

/**
 * A tiny in-memory stand-in for the TypeORM repository, matching only the
 * where-shapes FriendshipService actually uses. Black-box over the fake's
 * state rather than asserting call sequences — keeps tests robust to
 * refactors inside the service.
 */
function makeFakeRepo() {
  let seq = 0;
  const rows: any[] = [];

  function matches(row: any, where: any): boolean {
    if (where.id && row.id !== where.id) return false;
    if (where.requester && row.requester.id !== where.requester.id) return false;
    if (where.addressee && row.addressee.id !== where.addressee.id) return false;
    if (where.status && row.status !== where.status) return false;
    return true;
  }

  return {
    rows,
    findOne: jest.fn(async ({ where }: any) => rows.find((r) => matches(r, where)) ?? null),
    find: jest.fn(async ({ where }: any) => rows.filter((r) => matches(r, where))),
    create: jest.fn((partial: any) => ({
      id: `f${++seq}`,
      status: FriendshipStatus.PENDING,
      createdAt: new Date(),
      respondedAt: null,
      ...partial,
    })),
    save: jest.fn(async (row: any) => {
      const idx = rows.findIndex((r) => r.id === row.id);
      if (idx >= 0) rows[idx] = row;
      else rows.push(row);
      return row;
    }),
    remove: jest.fn(async (row: any) => {
      const idx = rows.findIndex((r) => r.id === row.id);
      if (idx >= 0) rows.splice(idx, 1);
      return row;
    }),
  };
}

describe('FriendshipService', () => {
  let service: FriendshipService;
  let repo: ReturnType<typeof makeFakeRepo>;

  const alex = { id: 'alex', name: 'Alex' } as any;
  const sam = { id: 'sam', name: 'Sam' } as any;
  const users = {
    findById: jest.fn(async (id: string) => (id === 'alex' ? alex : sam)),
  };

  beforeEach(async () => {
    repo = makeFakeRepo();
    const module = await Test.createTestingModule({
      providers: [
        FriendshipService,
        { provide: getRepositoryToken(Friendship), useValue: repo },
        { provide: UsersService, useValue: users },
      ],
    }).compile();
    service = module.get(FriendshipService);
  });

  it('rejects friending yourself', async () => {
    await expect(service.sendRequest('alex', 'alex')).rejects.toThrow(BadRequestException);
  });

  it('creates a pending request', async () => {
    const request = await service.sendRequest('alex', 'sam');
    expect(request.status).toBe(FriendshipStatus.PENDING);
    expect(request.requester.id).toBe('alex');
    expect(request.addressee.id).toBe('sam');
  });

  it('does not duplicate an already-pending request', async () => {
    await service.sendRequest('alex', 'sam');
    const second = await service.sendRequest('alex', 'sam');
    expect(repo.rows.filter((r) => r.status === FriendshipStatus.PENDING)).toHaveLength(1);
    expect(second.status).toBe(FriendshipStatus.PENDING);
  });

  it('auto-accepts when the other user already sent a request', async () => {
    await service.sendRequest('sam', 'alex'); // Sam -> Alex, pending
    const result = await service.sendRequest('alex', 'sam'); // Alex -> Sam: mutual
    expect(result.status).toBe(FriendshipStatus.ACCEPTED);
    expect(repo.rows).toHaveLength(1);
  });

  it('refuses to re-friend an already-accepted pair', async () => {
    await service.sendRequest('sam', 'alex');
    await service.sendRequest('alex', 'sam'); // now accepted
    await expect(service.sendRequest('alex', 'sam')).rejects.toThrow(ConflictException);
  });

  describe('respond', () => {
    it('only lets the addressee accept', async () => {
      const request = await service.sendRequest('alex', 'sam');
      await expect(service.respond(request.id, 'alex', true)).rejects.toThrow(ForbiddenException);
    });

    it('accepting sets status ACCEPTED', async () => {
      const request = await service.sendRequest('alex', 'sam');
      const accepted = await service.respond(request.id, 'sam', true);
      expect(accepted.status).toBe(FriendshipStatus.ACCEPTED);
    });

    it('declining removes the request entirely', async () => {
      const request = await service.sendRequest('alex', 'sam');
      await service.respond(request.id, 'sam', false);
      expect(repo.rows).toHaveLength(0);
    });
  });

  describe('friendsOf', () => {
    it('returns friends regardless of who sent the original request', async () => {
      await service.sendRequest('alex', 'sam');
      const request = repo.rows[0];
      await service.respond(request.id, 'sam', true);

      const alexFriends = await service.friendsOf('alex');
      const samFriends = await service.friendsOf('sam');
      expect(alexFriends.map((f) => f.friend.id)).toEqual(['sam']);
      expect(samFriends.map((f) => f.friend.id)).toEqual(['alex']);
    });
  });

  describe('assertFriends', () => {
    it('passes for two accepted friends in either direction', async () => {
      await service.sendRequest('alex', 'sam');
      await service.respond(repo.rows[0].id, 'sam', true);
      await expect(service.assertFriends('alex', 'sam')).resolves.toBeUndefined();
      await expect(service.assertFriends('sam', 'alex')).resolves.toBeUndefined();
    });

    it('throws for users who are not friends', async () => {
      await expect(service.assertFriends('alex', 'sam')).rejects.toThrow(NotFoundException);
    });

    it('always passes when checking a user against themselves', async () => {
      await expect(service.assertFriends('alex', 'alex')).resolves.toBeUndefined();
    });
  });
});
