# watch_rename

## 初期設定手順
1. Git をインストール参考 https://prog-8.com/docs/git-env-win
2. Node.jsを https://nodejs.org/ja/ からインストール 「推奨版」と「最新版」の2つのバージョンがあるが「推奨版」の方をインストールする。
3. Windows PowerShellを起動して「cd watch_rename」でフォルダー内に移動
4. Windows PowerShellで「git clone https://github.com/kakicg/watch_rename」を実行。
5. Windows PowerShellで「node -v」を実行し、node.jsがインストールされていることを確認。
6. Windows PowerShellで「npm install」を実行。
7. watch_renameの一つ上の階層のフォルダー内に ”watch_rename_env”ファイルをコピー。
8. ”watch_rename_env”ファイルを「メモ帳」などで編集。監視フォルダーへのパス(写真データが書き込まれるパス) リネームファイルのフォルダー(クライアントが指定したフォルダー)へのパス 許容タイムラグ(単位ミリ秒)など
9. startup.batを編集してWindowsのスタートアップフォルダーにコピー pushdの値(“ “内のパス)をwatch_renameが設置されたパスに書き換える

## Windows startup.batの場所
C:\Users\admin\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
