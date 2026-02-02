@echo off
echo === Installing Vector Search Dependencies ===
echo.

cd C:\test\antinet

echo Activating virtual environment...
call venv_arm64\Scripts\activate.bat

echo.
echo Installing sqlite-vec...
pip install sqlite-vec

echo.
echo Installing sentence-transformers...
pip install sentence-transformers

echo.
echo Installing torch (CPU version for embeddings)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo.
echo === Installation Complete ===
echo.

echo Testing imports...
python -c "import sqlite3; print('OK sqlite3')"
python -c "from sentence_transformers import SentenceTransformer; print('OK sentence-transformers')"

echo.
pause
