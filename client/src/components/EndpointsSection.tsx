import { ApiEndpoint, ApiType } from '@/types/api'

const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const GRAPHQL_METHODS = ['query', 'mutation', 'subscription']
const WS_METHODS = ['connect', 'send', 'subscribe']

const METHOD_OPTIONS: Record<ApiType, string[]> = {
  REST: REST_METHODS,
  GRAPHQL: GRAPHQL_METHODS,
  WEBSOCKET: WS_METHODS,
}

const PATH_PLACEHOLDER: Record<ApiType, string> = {
  REST: '/api/v1/auth/login',
  GRAPHQL: 'loginUser (operation name)',
  WEBSOCKET: 'ws://api.yourapp.com/events',
}

const BODY_PLACEHOLDER: Record<ApiType, string> = {
  REST: '{\n  "email": "user@test.com",\n  "password": "Test@1234"\n}',
  GRAPHQL: '{\n  "input": {\n    "email": "user@test.com"\n  }\n}',
  WEBSOCKET: '{\n  "type": "subscribe",\n  "channel": "notifications"\n}',
}

interface Props {
  endpoints: ApiEndpoint[]
  onChange: (endpoints: ApiEndpoint[]) => void
}

export default function EndpointsSection({ endpoints, onChange }: Props) {
  const update = (id: string, field: keyof ApiEndpoint, value: any) => {
    onChange(endpoints.map(ep =>
      ep.id === id ? { ...ep, [field]: value } : ep
    ))
  }

  const add = () => {
    onChange([...endpoints, {
      id: crypto.randomUUID(),
      apiType: 'REST',
      method: 'GET',
      path: '',
      requestBody: '',
      expectedResponse: '',
      authRequired: true,
      authType: 'Bearer',
      notes: '',
    }])
  }

  const remove = (id: string) => {
    if (endpoints.length === 1) return
    onChange(endpoints.filter(ep => ep.id !== id))
  }

  return (
    <div className="fg">
      <div className="flex items-center justify-between mb-2">
        <label className="lbl mb-0">
          Endpoints
          <span className="text-[#EF4444] ml-1">*</span>
        </label>
        <button
          type="button"
          onClick={add}
          className="text-[11.5px] text-[#4F46E5] font-medium flex items-center gap-1 hover:text-[#4338CA]"
        >
          ＋ Add endpoint
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {endpoints.map((ep, index) => (
          <div
            key={ep.id}
            className="border border-[#DDDDD9] rounded-xl p-3 bg-[#FAFAF8] relative"
          >
            {/* Endpoint header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11.5px] font-600 text-[#555]">
                Endpoint {index + 1}
              </div>
              {endpoints.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(ep.id)}
                  className="text-[11px] text-[#aaa] hover:text-[#EF4444] flex items-center gap-1"
                >
                  ✕ Remove
                </button>
              )}
            </div>

            {/* API type selector */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['REST', 'GRAPHQL', 'WEBSOCKET'] as ApiType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    update(ep.id, 'apiType', t)
                    update(ep.id, 'method', METHOD_OPTIONS[t][0])
                  }}
                  className={[
                    'py-1.5 rounded-lg border text-[11.5px] font-medium transition-all',
                    ep.apiType === t
                      ? 'border-[#4F46E5] bg-[#EEEDFE] text-[#4F46E5]'
                      : 'border-[#D8D8D4] bg-white text-[#666] hover:border-[#C4C2F4]',
                  ].join(' ')}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Method + Path on same row */}
            <div className="flex gap-2 mb-2">
              <select
                value={ep.method}
                onChange={e => update(ep.id, 'method', e.target.value)}
                className="border border-[#DDDDD9] rounded-lg px-2 py-1.5 text-[12.5px] font-mono font-medium text-[#111] bg-white outline-none cursor-pointer flex-shrink-0 w-[110px]"
              >
                {METHOD_OPTIONS[ep.apiType].map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
              <input
                type="text"
                value={ep.path}
                onChange={e => update(ep.id, 'path', e.target.value)}
                placeholder={PATH_PLACEHOLDER[ep.apiType]}
                className="flex-1 border border-[#DDDDD9] rounded-lg px-3 py-1.5 text-[12.5px] font-mono text-[#111] bg-white outline-none focus:border-[#4F46E5]"
              />
            </div>

            {/* Request body */}
            <div className="mb-2">
              <label className="text-[11px] font-500 text-[#888] block mb-1">
                {ep.apiType === 'GRAPHQL' ? 'Variables' : ep.apiType === 'WEBSOCKET' ? 'Payload' : 'Request body'}
                <span className="text-[#C0C0BC] font-normal ml-1">optional</span>
              </label>
              <textarea
                value={ep.requestBody || ''}
                onChange={e => update(ep.id, 'requestBody', e.target.value)}
                placeholder={BODY_PLACEHOLDER[ep.apiType]}
                rows={3}
                className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[12px] font-mono text-[#111] bg-white outline-none resize-none focus:border-[#4F46E5] leading-relaxed"
              />
            </div>

            {/* Expected response */}
            <div className="mb-2">
              <label className="text-[11px] font-500 text-[#888] block mb-1">
                Expected response
                <span className="text-[#C0C0BC] font-normal ml-1">optional</span>
              </label>
              <textarea
                value={ep.expectedResponse || ''}
                onChange={e => update(ep.id, 'expectedResponse', e.target.value)}
                placeholder={
                  ep.apiType === 'REST'
                    ? 'Status 200, body: { accessToken: string, user: { id, email } }'
                    : ep.apiType === 'GRAPHQL'
                    ? 'data.loginUser: { token: string, user: { id, email } }'
                    : 'Server emits "connected" event with { userId, sessionId }'
                }
                rows={2}
                className="w-full border border-[#DDDDD9] rounded-lg px-3 py-2 text-[12px] font-mono text-[#111] bg-white outline-none resize-none focus:border-[#4F46E5] leading-relaxed"
              />
            </div>

            {/* Auth toggle */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => update(ep.id, 'authRequired', !ep.authRequired)}
                className={[
                  'flex items-center gap-2 text-[12px] cursor-pointer select-none',
                  ep.authRequired ? 'text-[#4F46E5]' : 'text-[#888]',
                ].join(' ')}
              >
                <div className={[
                  'w-8 h-5 rounded-full relative transition-colors',
                  ep.authRequired ? 'bg-[#4F46E5]' : 'bg-[#D0D0CC]',
                ].join(' ')}>
                  <div className={[
                    'w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm',
                    ep.authRequired ? 'left-[17px]' : 'left-[3px]',
                  ].join(' ')} />
                </div>
                Auth required
              </div>

              {ep.authRequired && (
                <select
                  value={ep.authType || 'Bearer'}
                  onChange={e => update(ep.id, 'authType', e.target.value as any)}
                  className="border border-[#DDDDD9] rounded-lg px-2 py-1 text-[12px] bg-white outline-none cursor-pointer"
                >
                  <option value="Bearer">Bearer token</option>
                  <option value="API_Key">API Key</option>
                  <option value="Basic">Basic auth</option>
                </select>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-[#aaa] mt-1.5 leading-1.5">
        Add all endpoints this feature covers. The AI will generate test cases for each one including positive, negative, and edge case scenarios.
      </div>
    </div>
  )
}
