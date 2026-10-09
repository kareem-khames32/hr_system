module.exports = [
  {
    "route": "/headers",
    "status": 200,
    "ms": 9
  },
  {
    "route": "/redirect",
    "status": 302,
    "ms": 1
  },
  {
    "name": "silent response",
    "rejected": true,
    "ms": 308
  },
  {
    "name": "trickling headers",
    "rejected": true,
    "ms": 311
  },
  {
    "name": "TLS before response",
    "rejected": true,
    "ms": 328
  }
]
