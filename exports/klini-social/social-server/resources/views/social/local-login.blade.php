<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Klini Social · Desarrollo</title>
    <style>
        body{margin:0;background:#f5fbfa;color:#183f3b;font:16px system-ui;min-height:100dvh;display:grid;place-items:center}
        main{padding:28px;max-width:360px}h1{font-size:32px}p{line-height:1.6}
        button,a{box-sizing:border-box;display:block;width:100%;padding:16px;margin:12px 0;border:0;border-radius:16px;font:inherit;text-align:center}
        button{background:#008f83;color:white;cursor:pointer}a{color:#008f83}
    </style>
</head>
<body><main>
    <h1>Klini Social</h1>
    <p>Entorno local de desarrollo. Elige una cuenta de prueba para explorar las comunidades.</p>
    <form method="post" action="/local-login">@csrf
        <button name="account" value="member">Entrar como usuario</button>
        <button name="account" value="admin">Entrar como administrador</button>
    </form>
    @auth <a href="/social">Abrir comunidad</a> @endauth
    <p>Las cuentas de prueba sólo están habilitadas en el entorno local.</p>
</main></body></html>
