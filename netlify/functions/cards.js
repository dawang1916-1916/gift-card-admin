// netlify/functions/cards.js
// 礼品卡管理接口：GET / POST / PUT / DELETE

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

  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return error(401, '未登录', headers);

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return error(401, '登录已过期', headers);

  const method = event.httpMethod;
  const id = event.queryStringParameters?.id;
  const categoryId = event.queryStringParameters?.category_id;

  try {
    // GET - 获取礼品卡列表（可按分类筛选）
    if (method === 'GET') {
      let query = supabase
        .from('cards')
        .select(`
          *,
          categories(id, name),
          card_denominations(id, amount, currency, is_active),
          exchange_rates(id, from_currency, to_currency, rate, is_hidden)
        `)
        .order('sort_order');

      if (categoryId) query = query.eq('category_id', categoryId);
      if (id) query = query.eq('id', id).single();

      const { data, error: dbErr } = await query;
      if (dbErr) throw dbErr;
      return success(data, headers);
    }

    // POST - 新增礼品卡
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { name, category_id, country_code, currency, source_country, source_currency, icon_url } = body;

      if (!name) return error(400, '礼品卡名称不能为空', headers);

      const { data, error: dbErr } = await supabase
        .from('cards')
        .insert({ name, category_id, country_code, currency, source_country, source_currency, icon_url })
        .select()
        .single();

      if (dbErr) throw dbErr;
      await logOperation(supabase, user.id, 'CREATE_CARD', 'cards', data.id, null, data, event);
      return success(data, headers, 201);
    }

    // PUT - 更新礼品卡
    if (method === 'PUT') {
      if (!id) return error(400, '缺少 id', headers);
      const body = JSON.parse(event.body);

      const { data: old } = await supabase.from('cards').select('*').eq('id', id).single();
      const { data, error: dbErr } = await supabase
        .from('cards')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (dbErr) throw dbErr;
      await logOperation(supabase, user.id, 'UPDATE_CARD', 'cards', id, old, data, event);
      return success(data, headers);
    }

    // DELETE - 删除礼品卡
    if (method === 'DELETE') {
      if (!id) return error(400, '缺少 id', headers);

      const { data: old } = await supabase.from('cards').select('*').eq('id', id).single();
      const { error: dbErr } = await supabase.from('cards').delete().eq('id', id);

      if (dbErr) throw dbErr;
      await logOperation(supabase, user.id, 'DELETE_CARD', 'cards', id, old, null, event);
      return success({ message: '删除成功' }, headers);
    }

    return error(405, '不支持的请求方法', headers);

  } catch (err) {
    console.error(err);
    return error(500, '服务器错误：' + err.message, headers);
  }
};

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
