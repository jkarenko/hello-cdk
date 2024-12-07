#!/usr/bin/env bash

if ln -s ../../hooks/post-commit .git/hooks/post-commit 2>/dev/null; then
    echo "Symbolic link created for post-commit hook."
else
    echo "Symbolic link failed, copying instead."
    cp ./hooks/post-commit .git/hooks/post-commit
fi

chmod +x .git/hooks/post-commit
