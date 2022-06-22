# watch_rename

#初期設定手順
1. Git をインストール
参考 https://prog-8.com/docs/git-env-win
2. Node.jsを https://nodejs.org/ja/ からインストール 「推奨版」と「最新版」の2つのバージョンがあるが「推奨版」の方をインスト ールする。
3. Windows PawerShellを起動して「cd watch_rename」でフォルダー内に移 動
4. Windows PawerShellで「git clone https://github.com/kakicg/ watch_rename」を実行。
5. Windows PawerShellで「node -v」を実行し、node.jsがインストールされ ていることを確認。
6. Windows PawerShellで「npm install」を実行。
7. watch_renameの一つ上の階層のフォルダー内に ”watch_rename_env”ファ
イルをコピー。
8. ”watch_rename_env”ファイルを「メモ帳」などで編集。
監視フォルダーへのパス(写真データが書き込まれるパス) リネームファイルのフォルダー(クライアントが指定したフォルダー)へのパス 許容タイムラグ(単位ミリ秒)など
9. startup.batを編集してWindowsのスタートアップフォルダーにコピー pushdの値(“ “内のパス)をwatch_renameが設置されたパスに書き換える
