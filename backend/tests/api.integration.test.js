const request = require('supertest');
const { app } = require('../src/server');

const registerAndLogin = async ({
  name = 'Test User',
  email = 'test@example.com',
  password = 'Password123',
} = {}) => {
  const agent = request.agent(app);

  const registerResponse = await agent.post('/api/auth/register').send({
    name,
    email,
    password,
    confirmPassword: password,
  });

  return {
    agent,
    registerResponse,
    accessToken: registerResponse.body.data.accessToken,
    user: registerResponse.body.data.user,
  };
};

describe('API integration', () => {
  test('register returns access token and refresh cookie', async () => {
    const { registerResponse } = await registerAndLogin();

    expect(registerResponse.statusCode).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.user.email).toBe('test@example.com');
    expect(registerResponse.body.data.accessToken).toBeDefined();
    expect(registerResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('refreshToken=')])
    );
  });

  test('refresh token returns a new access token using cookie auth', async () => {
    const { agent } = await registerAndLogin({
      email: 'refresh@example.com',
    });

    const refreshResponse = await agent.post('/api/auth/refresh-token').send({});

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data.accessToken).toBeDefined();
  });

  test('authenticated user can create a workspace', async () => {
    const { accessToken } = await registerAndLogin({
      email: 'workspace@example.com',
    });

    const response = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Engineering Workspace',
        description: 'Core product work',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Engineering Workspace');
    expect(response.body.data.owner).toBeDefined();
  });

  test('authenticated user can create, list, update, and delete a board', async () => {
    const { accessToken } = await registerAndLogin({
      email: 'board@example.com',
    });

    const workspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Board Workspace',
      });

    const workspaceId = workspaceResponse.body.data._id;

    const createBoardResponse = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Sprint Board',
        description: 'Track sprint tasks',
        workspaceId,
      });

    expect(createBoardResponse.statusCode).toBe(201);
    const boardId = createBoardResponse.body.data._id;

    const listBoardsResponse = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(listBoardsResponse.statusCode).toBe(200);
    expect(listBoardsResponse.body.data).toHaveLength(1);
    expect(listBoardsResponse.body.data[0]._id).toBe(boardId);

    const updateBoardResponse = await request(app)
      .put(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Sprint Board',
        background: '#123456',
      });

    expect(updateBoardResponse.statusCode).toBe(200);
    expect(updateBoardResponse.body.data.name).toBe('Updated Sprint Board');
    expect(updateBoardResponse.body.data.background).toBe('#123456');

    const deleteBoardResponse = await request(app)
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteBoardResponse.statusCode).toBe(200);
    expect(deleteBoardResponse.body.success).toBe(true);
    expect(deleteBoardResponse.body.data.id).toBe(boardId);
  });

  test('card search endpoint returns matching cards instead of falling into :id route', async () => {
    const { accessToken } = await registerAndLogin({
      email: 'cards@example.com',
    });

    const workspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Search Workspace',
      });

    const workspaceId = workspaceResponse.body.data._id;

    const boardResponse = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Search Board',
        workspaceId,
      });

    const boardId = boardResponse.body.data._id;

    const listResponse = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'To Do',
        boardId,
      });

    const listId = listResponse.body.data._id;

    const createCardResponse = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Fix refresh token bug',
        listId,
        boardId,
        labels: ['backend', 'bug'],
      });

    expect(createCardResponse.statusCode).toBe(201);

    const searchResponse = await request(app)
      .get('/api/cards/search')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({
        boardId,
        keyword: 'refresh',
      });

    expect(searchResponse.statusCode).toBe(200);
    expect(searchResponse.body.success).toBe(true);
    expect(searchResponse.body.data).toHaveLength(1);
    expect(searchResponse.body.data[0].title).toBe('Fix refresh token bug');
  });

  test('authenticated user can move a checklist item from one card to another card', async () => {
    const { accessToken } = await registerAndLogin({
      email: 'move-checklist@example.com',
    });

    const workspaceResponse = await request(app)
      .post('/api/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Checklist Move Workspace',
      });

    const workspaceId = workspaceResponse.body.data._id;

    const boardResponse = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Checklist Move Board',
        workspaceId,
      });

    const boardId = boardResponse.body.data._id;

    const listResponse = await request(app)
      .post('/api/lists')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Doing',
        boardId,
      });

    const listId = listResponse.body.data._id;

    const sourceCardResponse = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Source Card',
        listId,
        boardId,
      });

    const targetCardResponse = await request(app)
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Target Card',
        listId,
        boardId,
      });

    const sourceCardId = sourceCardResponse.body.data._id;
    const targetCardId = targetCardResponse.body.data._id;

    const addChecklistResponse = await request(app)
      .post(`/api/cards/${sourceCardId}/checklist`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        text: 'Move me to another card',
      });

    const itemId = addChecklistResponse.body.data[0]._id;

    const moveResponse = await request(app)
      .post(`/api/cards/${sourceCardId}/checklist/${itemId}/move`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        targetCardId,
      });

    expect(moveResponse.statusCode).toBe(200);
    expect(moveResponse.body.success).toBe(true);
    expect(moveResponse.body.data.sourceCardId).toBe(sourceCardId);
    expect(moveResponse.body.data.targetCardId).toBe(targetCardId);
    expect(moveResponse.body.data.sourceChecklist).toHaveLength(0);
    expect(moveResponse.body.data.targetChecklist).toHaveLength(1);
    expect(moveResponse.body.data.targetChecklist[0].text).toBe(
      'Move me to another card'
    );
  });
});
