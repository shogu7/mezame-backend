module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Manhwa', {
    manhwa_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    original_title: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    release_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    total_chapters: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    total_seasons: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cover_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    }
  }, {
    tableName: 'manhwa',
    timestamps: false
  });
};
