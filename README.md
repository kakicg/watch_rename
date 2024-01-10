# watch_rename

## 初期設定手順
1. Git をインストール参考 https://prog-8.com/docs/git-env-win
2. Node.jsを https://nodejs.org/ja/ からインストール 「推奨版」と「最新版」の2つのバージョンがあるが「推奨版」の方をインストールする。
3. Windows PwerShellを起動して「watch_rename」でフォルダーを作成して、そのフォルダーへ移動。
4. Windows PawerShellで「git clone https://github.com/kakicg/watch_rename」を実行。
5. Windows PawerShellで「node -v」を実行し、node.jsがインストールされていることを確認。
6. Windows PawerShellで「npm install」を実行。
7. ”env”ファイルを「メモ帳」などで編集。監視フォルダーへのパス(写真データが書き込まれるパス) リネームファイルのフォルダー(クライアントが指定したフォルダー)へのパス 許容タイムラグ(単位ミリ秒)など
8. startup.batを編集してWindowsのスタートアップフォルダーにコピー pushdの値がwatch_renameのパスとして設定されていることを確認する。

## Windows startup.batの場所 (Windows10)
C:\Users\admin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
