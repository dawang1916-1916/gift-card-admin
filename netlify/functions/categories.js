// netlify/functions/categories.js
// 分类管理接口：GET / POST / PUT / DELETE

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // 验证 JWT Token
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return error(401, '未登录', headers);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return error(401, '登录已过期', headers);

  const method = event.httpMethod;
  const id = event.queryStringParameters?.id;

  try {
    // GET - 获取所有分类（树形结构）
    if (method === 'GET') {
      const { data, error: dbErr } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (dbErr) throw dbErr;

      // 转为树形结构
      const tree = buildTree(data);
      return success(tree, headers);
    }

    // POST - 新增分类
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { name, parent_id, icon, sort_order } = body;

      if (!name) return error(400, '分类名称不能为空', headers);

      const { data, error: dbErr } = await supabase
        .from('categories')
        .insert({ name, parent_id: parent_id || null, icon, sort_order: sort_order || 0 })
        .select()
        .single();

      if (dbErr) throw dbErr;

      await logOperation(supabase, user.id, 'CREATE_CATEGORY', 'categories', data.id, null, data, event);
      return success(data, headers, 201);
    }

    // PUT - 更新分类
    if (method === 'PUT') {
      if (!id) return error(400, '缺少 id', headers);
      const body = JSON.parse(event.body);

      const { data: old } = await supabase.from('categories').select('*').eq('id', id).single();
      const { data, error: dbErr } = await supabase
        .from('categories')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (dbErr) throw dbErr;

      await logOperation(supabase, user.id, 'UPDATE_CATEGORY', 'categories', id, old, data, event);
      return success(data, headers);
    }

    // DELETE - 删除分类
    if (method === 'DELETE') {
      if (!id) return error(400, '缺少 id', headers);

      const { data: old } = await supabase.from('categories').select('*').eq('id', id).single();
      const { error: dbErr } = await supabase.from('categories').delete().eq('id', id);

      if (dbErr) throw dbErr;

      await logOperation(supabase, user.id, 'DELETE_CATEGORY', 'categories', id, old, null, event);
      return success({ message: '删除成功' }, headers);
    }

    return error(405, '不支持的请求方法', headers);

  } catch (err) {
    console.error(err);
    return error(500, '服务器错误：' + err.message, headers);
  }
};

// 将扁平数组转为树形结构
function buildTree(items, parentId = null) {
  return items
    .filter(i => i.parent_id === parentId)
    .map(i => ({ ...i, children: buildTree(items, i.id) }));
}

// 记录操作日志
async function logOperation(supabase, userId, action, tableName, recordId, oldData, newData, event) {
  await supabase.from('operation_logs').insert({
    user_id: userId,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
    ip_address: event.headers['x-forwarded-for'] || event.headers['client-ip'],
  });
}

function success(data, headers, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify({ success: true, data }) };
}

function error(statusCode, message, headers) {
  return { statusCode, headers, body: JSON.stringify({ success: false, message }) };
}
